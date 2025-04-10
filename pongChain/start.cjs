const path = require("path");
const fs = require("fs");
const { ethers, run } = require("hardhat");
const { spawn } = require("child_process");

const ROOT_DIR = __dirname; // <- racine du projet
const BACKEND_DIR = path.join(ROOT_DIR, "backend-blockchain");
const SCRIPTS_DIR = path.join(ROOT_DIR, "scripts");
const ADDRESSES_FILE = path.join(ROOT_DIR, "addresses.json");

async function deployContractsIfNeeded(chainId, addressesData) {
    if (!addressesData[chainId]) {
        addressesData[chainId] = {};
    }

    console.log("Compiling contracts...");
    await run('compile');

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

    const goatNft = await deployIfNeeded("GoatNft", "GOATNFT_ADDRESS");
    const pongToken = await deployIfNeeded("PongToken", "PONGTOKEN_ADDRESS");
    const tournamentNft = await deployIfNeeded("TournamentNft", "TOURNAMENTNFT_ADDRESS");
    const masterContract = await deployIfNeeded(
        "MasterContract",
        "MASTERCONTRACT_ADDRESS",
        goatNft,
        pongToken,
        tournamentNft
    );

    async function transferOwnershipIfNeeded(contractName, contractAddr) {
        const contract = await ethers.getContractAt(contractName, contractAddr);
        const currentOwner = await contract.owner();
        if (currentOwner.toLowerCase() !== masterContract.toLowerCase()) {
            console.log(`[${contractName}] Transferring ownership to MasterContract...`);
            const tx = await contract.transferOwnership(masterContract);
            await tx.wait();
            console.log(`[${contractName}] Ownership transferred`);
        } else {
            console.log(`[${contractName}] Ownership already belongs to MasterContract`);
        }
    }

    await transferOwnershipIfNeeded("GoatNft", goatNft);
    await transferOwnershipIfNeeded("PongToken", pongToken);
    await transferOwnershipIfNeeded("TournamentNft", tournamentNft);

    fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(addressesData, null, 2));
    console.log("✅ addresses.json updated!");

    const reportPath = path.join(ROOT_DIR, `report-${chainId}.txt`);
    const report = `
Deployment report for chainId ${chainId}
────────────────────────────────────────────
GoatNft         : ${goatNft}
PongToken       : ${pongToken}
TournamentNft   : ${tournamentNft}
MasterContract  : ${masterContract}
`.trim();
    fs.writeFileSync(reportPath, report);
    console.log(`✅ Deployment report written to ${reportPath}`);
}

function runExportAbis() {
    return new Promise((resolve, reject) => {
        const exportAbis = spawn('node', [path.join(SCRIPTS_DIR, "exportAbis.cjs")], {
            stdio: 'inherit'
        });

        exportAbis.on('exit', (code) => {
            if (code === 0) {
                console.log("✅ exportAbis script completed successfully.");
                resolve();
            } else {
                reject(new Error(`❌ exportAbis script failed with code ${code}`));
            }
        });

        exportAbis.on('error', (err) => {
            reject(err);
        });
    });
}

function startBackend() {
    console.log("🚀 Starting backend server...");
    const backend = spawn('node', [path.join(BACKEND_DIR, 'server.js')], {
        stdio: 'inherit',
        env: { ...process.env }
    });

    backend.on('exit', (code) => {
        console.log(`🔚 Backend server exited with code ${code}`);
    });

    backend.on('error', (err) => {
        console.error("❌ Error starting backend server:", err);
        process.exit(1);
    });
}

async function main() {
    try {
        const network = await ethers.provider.getNetwork();
        const chainId = network.chainId.toString();

        if (chainId !== "43113") {
            console.error("❌ Not on Fuji network. Please switch to Fuji (chainId: 43113)");
            process.exit(1);
        }

        console.log(`Current network: ${network.name} (chainId: ${chainId})`);

        let addressesData = {};
        if (fs.existsSync(ADDRESSES_FILE)) {
            addressesData = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
        } else {
            console.log("addresses.json not found. Creating a new one...");
        }

        await deployContractsIfNeeded(chainId, addressesData);
        await runExportAbis();
        startBackend();
    } catch (err) {
        console.error("❌ Error during start process:", err);
        process.exit(1);
    }
}

main();
