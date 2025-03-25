// scripts/deploy.js
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

// Fichier où l'on stocke les adresses déployées
const ADDRESSES_FILE = path.join(__dirname, "..", "addresses.json");

async function main() {
    // 1) Récupère le réseau (chainId)
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId.toString();
    console.log(`Réseau actuel : ${network.name} (chainId: ${chainId})`);

    // 2) Charger (ou init) le JSON des adresses
    let addressesData;
    try {
        addressesData = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
    } catch (err) {
        console.log("Fichier addresses.json inexistant, on en crée un...");
        addressesData = {};
    }
    if (!addressesData[chainId]) {
        addressesData[chainId] = {};
    }

    // Fonction qui ne déploie un contrat que s'il n'est pas déjà déployé
    async function deployIfNeeded(contractName, saveKey, ...constructorArgs) {
        if (addressesData[chainId][saveKey]) {
            console.log(`[${contractName}] déjà déployé à : ${addressesData[chainId][saveKey]}`);
            return addressesData[chainId][saveKey];
        }
        console.log(`[${contractName}] pas encore déployé, déploiement...`);
        const Factory = await ethers.getContractFactory(contractName);
        const contract = await Factory.deploy(...constructorArgs);
        await contract.waitForDeployment();
        const deployedAddr = await contract.getAddress();
        addressesData[chainId][saveKey] = deployedAddr;
        console.log(`[${contractName}] déployé à : ${deployedAddr}`);
        return deployedAddr;
    }

    // ───────────────────────────────────────────────────────────
    // Déploiements
    // ───────────────────────────────────────────────────────────
    const goatNftAddr = await deployIfNeeded("GoatNft", "goatNft");
    const pongTokenAddr = await deployIfNeeded("PongToken", "pongToken");
    const tournamentNftAddr = await deployIfNeeded("TournamentNft", "tournamentNft");

    // MasterContract (supposons un constructor : (goatAddr, pongAddr, tournamentAddr))
    const masterContractAddr = await deployIfNeeded(
        "MasterContract",
        "masterContract",
        goatNftAddr,
        pongTokenAddr,
        tournamentNftAddr
    );

    // ───────────────────────────────────────────────────────────
    // 3) Transférer l'ownership de GoatNft, PongToken, TournamentNft
    //    vers le MasterContract (si ce n'est pas déjà fait)
    // ───────────────────────────────────────────────────────────

    // Helper pour un "transferOwnership" conditionnel
    async function transferOwnershipIfNeeded(contractName, contractAddr) {
        const contract = await ethers.getContractAt(contractName, contractAddr);
        const currentOwner = await contract.owner();
        if (currentOwner.toLowerCase() !== masterContractAddr.toLowerCase()) {
            console.log(`[${contractName}] transfert ownership -> MasterContract...`);
            const tx = await contract.transferOwnership(masterContractAddr);
            await tx.wait();
            console.log(`[${contractName}] ownership transféré au MasterContract`);
        } else {
            console.log(`[${contractName}] ownership déjà au MasterContract`);
        }
    }

    // Transferer l’ownership de GoatNft
    await transferOwnershipIfNeeded("GoatNft", goatNftAddr);

    // Transferer l’ownership de PongToken
    await transferOwnershipIfNeeded("PongToken", pongTokenAddr);

    // Transferer l’ownership de TournamentNft
    await transferOwnershipIfNeeded("TournamentNft", tournamentNftAddr);

    // 4) Écrire / Sauvegarder addresses.json
    fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(addressesData, null, 2));
    console.log("addresses.json mis à jour !");
}

// Appel principal
main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Erreur de déploiement:", err);
        process.exit(1);
    });
