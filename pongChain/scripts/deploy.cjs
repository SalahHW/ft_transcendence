const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

// Path to the addresses storage file
const ADDRESSES_FILE = path.join(__dirname, "..", "addresses.json");

async function main() {
    // Step 1 — Detect the current network
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId.toString();
    console.log(`Current network: ${network.name} (chainId: ${chainId})`);

    // Step 2 — Load (or initialize) the address storage
    let addressesData;
    try {
        addressesData = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
    } catch (err) {
        console.log("addresses.json not found. Creating a new one...");
        addressesData = {};
    }
    if (!addressesData[chainId]) {
        addressesData[chainId] = {};
    }

    // Deploy only if the contract is not already deployed
    async function deployIfNeeded(contractName, saveKey, ...constructorArgs) {
        if (addressesData[chainId][saveKey]) {
            console.log(`[${contractName}] already deployed at: ${addressesData[chainId][saveKey]}`);
            return addressesData[chainId][saveKey];
        }

        console.log(`[${contractName}] not deployed yet. Deploying...`);
        const Factory = await ethers.getContractFactory(contractName);
        const contract = await Factory.deploy(...constructorArgs);
        await contract.waitForDeployment();
        const deployedAddr = await contract.getAddress();
        addressesData[chainId][saveKey] = deployedAddr;
        console.log(`[${contractName}] deployed at: ${deployedAddr}`);
        return deployedAddr;
    }

    console.log("\n──────── Deploying contracts ────────");

    // Step 3 — Deploy contracts in proper order
    const goatNftAddr = await deployIfNeeded("GoatNft", "goatNft");
    const pongTokenAddr = await deployIfNeeded("PongToken", "pongToken");
    const tournamentNftAddr = await deployIfNeeded("TournamentNft", "tournamentNft");
    const masterContractAddr = await deployIfNeeded(
        "MasterContract",
        "masterContract",
        goatNftAddr,
        pongTokenAddr,
        tournamentNftAddr
    );

    // Step 4 — Transfer ownership to MasterContract if necessary
    async function transferOwnershipIfNeeded(contractName, contractAddr) {
        const contract = await ethers.getContractAt(contractName, contractAddr);
        const currentOwner = await contract.owner();
        if (currentOwner.toLowerCase() !== masterContractAddr.toLowerCase()) {
            console.log(`[${contractName}] Transferring ownership to MasterContract...`);
            const tx = await contract.transferOwnership(masterContractAddr);
            await tx.wait();
            console.log(`[${contractName}] Ownership transferred to MasterContract`);
        } else {
            console.log(`[${contractName}] Ownership already belongs to MasterContract`);
        }
    }

    await transferOwnershipIfNeeded("GoatNft", goatNftAddr);
    await transferOwnershipIfNeeded("PongToken", pongTokenAddr);
    await transferOwnershipIfNeeded("TournamentNft", tournamentNftAddr);

    // Step 5 — Save updated addresses.json
    fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(addressesData, null, 2));
    console.log("✅ addresses.json updated!");

    // Step 6 — Export .env file for the Fastify server
    const envPath = path.join(__dirname, "..", ".env");
    let envContent = "";
    for (const [key, value] of Object.entries(addressesData[chainId])) {
        envContent += `${key.toUpperCase()}_ADDRESS=${value}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log("✅ .env file generated!");

    // Step 7 — Write a deployment report for this chain
    const reportPath = path.join(__dirname, "..", `report-${chainId}.txt`);
    const reportContent = `
Deployment report for chainId ${chainId}
────────────────────────────────────────────
GoatNft         : ${goatNftAddr}
PongToken       : ${pongTokenAddr}
TournamentNft   : ${tournamentNftAddr}
MasterContract  : ${masterContractAddr}
`.trim();
    fs.writeFileSync(reportPath, reportContent);
    console.log(`✅ Deployment report written to report-${chainId}.txt`);
}

// Execute the script
main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Deployment error:", err);
        process.exit(1);
    });
