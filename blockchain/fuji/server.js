import Fastify from 'fastify';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import 'dotenv/config';

console.log("Clé privée utilisée :", process.env.PRIVATE_KEY);

const fastify = Fastify({ logger: true });

const deployModule = await import(process.env.DEPLOY_PATH);
const deploy = deployModule.default; // Récupérer la fonction exportée
deploy();
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

//const contractAddress = process.env.CONTRACT_ADDRESS;
const abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function addPlayer(string memory _playerName) public"
];
const contract = new ethers.Contract(contractAddress, abi, wallet);

// Deploiement contrat
fastify.post('/contrat', async function (request, reply) {
    try {
        const { contract } = request

    } catch (error) {
        reply.code(500).send({ error: error.message });
    }
});

// Creation joueur
fastify.post('/player', async function (request, reply) {
    try {
        const { playerName } = request.body;
        const player = await contract.addPlayer(playerName);
    } catch (error) {
        reply.code(500).send({ error: error.message });
    }
});

// // Route pour récupérer le solde d'un joueur
// fastify.get('/balance/:address', async function (request, reply) {
//     try {
//         const { address } = request.params;
//         const balance = await contract.balanceOf(address);
//         return { address, balance: balance.toString() };
//     } catch (error) {
//         reply.code(500).send({ error: error.message });
//     }
// });

// // Route pour envoyer des tokens à un joueur
// fastify.post('/send', async function (request, reply) {
//     try {
//         const { to, amount } = request.body;
//         const tx = await contract.transfer(to, ethers.parseUnits(amount, 18));
//         await tx.wait();
//         return { message: "Tokens envoyés avec succès", txHash: tx.hash };
//     } catch (error) {
//         reply.code(500).send({ error: error.message });
//     }
// });

// fastify.get('/score/:player', async function (request, reply) {
//     try {
//         const { player, score } = request.body;
//         const tx = await contract.setScore(player, score);
//         await tx.wait();
//         return { message: "Score mis à jour avec succès", txHash: tx.hash };
//     } catch (error) {
//         reply.code(500).send({ error: error.message });
//     }
// });


const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log(`🚀 Server running at http://127.0.0.1:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
