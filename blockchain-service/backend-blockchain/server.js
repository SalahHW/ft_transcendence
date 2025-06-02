import path from 'path';
import fs from 'fs';
import Fastify from 'fastify';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import jwtVerifyPlugin from './plugins/jwtVerifyPlugin.js';
import dotenv from 'dotenv';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({ logger: true });

await fastify.register(jwtVerifyPlugin);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { RPC_URL, PRIVATE_KEY, BLOCKCHAIN_SERVICE_PORT } = process.env;

const ADDRESSES_PATH = path.join(__dirname, '..', 'addresses.json');
const chainId = '43113'; // Fuji testnet

let addresses = {};
try {
    addresses = JSON.parse(fs.readFileSync(ADDRESSES_PATH, 'utf-8'))[chainId];
    if (!addresses) throw new Error('No addresses found for chainId 43113');
} catch (err) {
    console.error('❌ Failed to read addresses.json:', err.message);
    process.exit(1);
}

const provider = new JsonRpcProvider(RPC_URL);
const wallet = new Wallet(PRIVATE_KEY, provider);

function loadAbi(name) {
    const abiPath = path.join(__dirname, 'abi', `${name}.json`);
    return JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
}

function loadContract(name, address) {
    const abi = loadAbi(name);
    return new Contract(address, abi, wallet);
}

try {
    const masterContract = loadContract(
        'MasterContract',
        addresses.MASTERCONTRACT_ADDRESS
    );
    const goatNft = loadContract('GoatNft', addresses.GOATNFT_ADDRESS);
    const pongToken = loadContract('PongToken', addresses.PONGTOKEN_ADDRESS);
    const tournamentNft = loadContract(
        'TournamentNft',
        addresses.TOURNAMENTNFT_ADDRESS
    );

    fastify.decorate('masterContract', masterContract);
    fastify.decorate('goatNft', goatNft);
    fastify.decorate('pongToken', pongToken);
    fastify.decorate('tournamentNft', tournamentNft);

    const routes = [
        './routes/addPlayer.js',
        './routes/reportMatch.js',
        './routes/reportTournament.js',
        './routes/getPlayer.js',
        './routes/getMatchByPlayer.js',
        './routes/getMatchByWinner.js',
        './routes/getMatchById.js',
        './routes/getTournamentById.js',
        './routes/getTournamentByWinner.js',
        './routes/getGoatOwner.js',
        './routes/getTournamentNftOwner.js',
    ];

    for (const route of routes) {
        const routeModule = await import(route);
        await fastify.register(routeModule.default);
    }

    fastify.get('/status', async () => {
        return { status: 'online', network: RPC_URL };
    });

    const start = async () => {
        try {
            await fastify.listen({
                port: BLOCKCHAIN_SERVICE_PORT,
                host: '0.0.0.0',
            });
            fastify.log.info(
                `✅ Server is listening on http://localhost:${BLOCKCHAIN_SERVICE_PORT}`
            );
        } catch (err) {
            fastify.log.error(err);
            process.exit(1);
        }
    };

    start();
} catch (error) {
    console.error('❌ Failed to initialize contracts:', error.message);
    process.exit(1);
}
