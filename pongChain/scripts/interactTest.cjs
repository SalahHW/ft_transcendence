const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const { name: networkName, chainId } = await ethers.provider.getNetwork();
    console.log("\n=== Test d'interaction avec les contrats sur le réseau:", networkName, "===\n");

    const addressesPath = path.join(__dirname, "..", "addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath));

    if (!addresses[chainId]) {
        throw new Error(`Aucune adresse trouvée pour le chainId ${chainId}`);
    }

    const addr = addresses[chainId];
    const masterAddr = addr.masterContract;

    const Master = await ethers.getContractAt("MasterContract", masterAddr);
    const GoatNft = await ethers.getContractAt("GoatNft", addr.goatNft);
    const PongToken = await ethers.getContractAt("PongToken", addr.pongToken);
    const TournamentNft = await ethers.getContractAt("TournamentNft", addr.tournamentNft);

    // Ajout d'un joueur fictif
    const playerName = "Richard";
    const playerAddress = "0x123400000000000000000000000000000000abcd";
    console.log(`Ajout du joueur: '${playerName}' => ${playerAddress}`);
    const tx1 = await Master.addPlayer(playerName, playerAddress);
    await tx1.wait();

    // Vérifier le solde de tokens de Alice
    const balance = await PongToken.balanceOf(playerAddress);
    console.log(`Solde de PongToken de ${playerName}:`, balance.toString());

    // Déclaration d'un match gagné
    console.log(`Report d'un match (#1), vainqueur => '${playerName}' (adresse ${playerAddress})`);
    const tx2 = await Master.reportMatch(playerName, playerName, 1, 11, 5, playerAddress);
    await tx2.wait();
    console.log("Match #1 reporté !");

    // Création d'un tournoi fictif
    console.log("Création d'un tournoi avec matchId #1, vainqueur =>", playerAddress);
    const tx3 = await Master.reportTournament(1234567890, [1], playerAddress);
    await tx3.wait();
    console.log("Tournoi enregistré et NFT minté");

    // Lecture de l'adresse gagnante du tournoi
    const winner = await TournamentNft.getTracking(1);
    console.log("Adresse gagnante du tournoi tokenId #1:", winner);

}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("[ERREUR]", err);
        process.exit(1);
    });
