const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const fastify = require('fastify')({ logger: true });

const { JsonRpcProvider, Wallet, Contract } = require("ethers");

// Load environment variables
const {
    RPC_URL,
    PRIVATE_KEY,
    GOATNFT_ADDRESS,
    PONGTOKEN_ADDRESS,
    TOURNAMENTNFT_ADDRESS,
    MASTERCONTRACT_ADDRESS
} = process.env;

// Initialize provider and signer
const provider = new JsonRpcProvider(RPC_URL);
const wallet = new Wallet(PRIVATE_KEY, provider);

// Load ABI from abi/ directory
function loadAbi(contractName) {
    const abiPath = path.join(__dirname, 'abi', `${contractName}.json`);
    return JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
}

// Instantiate contracts
function loadContract(name, address) {
    const abi = loadAbi(name);
    return new Contract(address, abi, wallet);
}

try {
    const masterContract = loadContract("MasterContract", MASTERCONTRACT_ADDRESS);
    const goatNft = loadContract("GoatNft", GOATNFT_ADDRESS);
    const pongToken = loadContract("PongToken", PONGTOKEN_ADDRESS);
    const tournamentNft = loadContract("TournamentNft", TOURNAMENTNFT_ADDRESS);

    // Make contracts available to routes
    fastify.decorate('masterContract', masterContract);
    fastify.decorate('goatNft', goatNft);
    fastify.decorate('pongToken', pongToken);
    fastify.decorate('tournamentNft', tournamentNft);

    // Register routes
    fastify.register(require('./plugins/bigIntSerializer'));
    fastify.register(require('./routes/addPlayer'));
    fastify.register(require('./routes/reportMatch'));
    fastify.register(require('./routes/reportTournament'));
    fastify.register(require('./routes/getPlayer'));
    fastify.register(require('./routes/getMatchByPlayer'));
    fastify.register(require('./routes/getMatchByWinner'));
    fastify.register(require('./routes/getMatchById'));
    fastify.register(require('./routes/getTournamentById'));
    fastify.register(require('./routes/getTournamentByWinner'));


    // Optional health check
    fastify.get('/status', async (request, reply) => {
        reply.send({ status: 'online', network: RPC_URL });
    });

    // Launch the Fastify server
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

