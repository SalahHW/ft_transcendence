const path = require('path');
const fs = require('fs');
const fastify = require('fastify')({ logger: true });
const { JsonRpcProvider, Wallet, Contract } = require("ethers");

// Load minimal env (.env)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { RPC_URL, PRIVATE_KEY } = process.env;

// Load contract addresses from addresses.json
const ADDRESSES_PATH = path.join(__dirname, '..', 'addresses.json');
const chainId = "43113"; // Fuji testnet

let addresses = {};
try {
    addresses = JSON.parse(fs.readFileSync(ADDRESSES_PATH, 'utf-8'))[chainId];
    if (!addresses) throw new Error("No addresses found for chainId 43113");
} catch (err) {
    console.error("❌ Failed to read addresses.json:", err.message);
    process.exit(1);
}

// Setup provider and signer
const provider = new JsonRpcProvider(RPC_URL);
const wallet = new Wallet(PRIVATE_KEY, provider);

// Load ABI from backend-blockchain/abi/
function loadAbi(name) {
    const abiPath = path.join(__dirname, 'abi', `${name}.json`);
    return JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
}

function loadContract(name, address) {
    const abi = loadAbi(name);
    return new Contract(address, abi, wallet);
}

// Load contracts
try {
    const masterContract = loadContract("MasterContract", addresses.MASTERCONTRACT_ADDRESS);
    const goatNft = loadContract("GoatNft", addresses.GOATNFT_ADDRESS);
    const pongToken = loadContract("PongToken", addresses.PONGTOKEN_ADDRESS);
    const tournamentNft = loadContract("TournamentNft", addresses.TOURNAMENTNFT_ADDRESS);

    // Make contracts accessible in routes
    fastify.decorate('masterContract', masterContract);
    fastify.decorate('goatNft', goatNft);
    fastify.decorate('pongToken', pongToken);
    fastify.decorate('tournamentNft', tournamentNft);

    // Swagger plugins
    fastify.register(require('@fastify/swagger'), {
        mode: 'static',
        specification: {
            path: path.join(__dirname, 'openapi.yaml'), // ou change selon l'endroit où tu mets le fichier
            baseDir: __dirname,
        },
    });

    fastify.register(require('@fastify/swagger-ui'), {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: false,
        },
    });

    // Register routes
    fastify.register(require('./routes/addPlayer'));
    fastify.register(require('./routes/reportMatch'));
    fastify.register(require('./routes/reportTournament'));
    fastify.register(require('./routes/getPlayer'));
    fastify.register(require('./routes/getMatchByPlayer'));
    fastify.register(require('./routes/getMatchByWinner'));
    fastify.register(require('./routes/getMatchById'));
    fastify.register(require('./routes/getTournamentById'));
    fastify.register(require('./routes/getTournamentByWinner'));
    fastify.register(require('./routes/getGoatOwner'));
    fastify.register(require('./routes/getTournamentNftOwner'));

    // Health check route
    fastify.get('/status', async () => {
        return { status: 'online', network: RPC_URL };
    });

    // Start the Fastify server
    const start = async () => {
        try {
            await fastify.listen({ port: 3000, host: '0.0.0.0' });
            fastify.log.info(`Fastify server is listening on http://localhost:3000`);
        } catch (err) {
            fastify.log.error(err);
            process.exit(1);
        }
    };

    start();
} catch (error) {
    console.error("❌ Failed to initialize contracts:", error.message);
    process.exit(1);
}
