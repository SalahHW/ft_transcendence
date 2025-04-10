const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const hre = require('hardhat');

dotenv.config();

const contractsFile = path.join(__dirname, 'addresses.json');

function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch {
        return false;
    }
}

async function deployIfNeeded() {
    if (fileExists(contractsFile)) {
        console.log("✅ Contracts already deployed. Using:", contractsFile);
        return;
    }

    console.log("🚀 No contracts found. Deploying on network:", hre.network.name);

    const [deployer] = await hre.ethers.getSigners();

    const GoatNft = await hre.ethers.deployContract("GoatNft");
    await GoatNft.waitForDeployment();

    const PongToken = await hre.ethers.deployContract("PongToken");
    await PongToken.waitForDeployment();

    const TournamentNft = await hre.ethers.deployContract("TournamentNft");
    await TournamentNft.waitForDeployment();

    const MasterContract = await hre.ethers.deployContract("MasterContract", [
        GoatNft.target,
        PongToken.target,
        TournamentNft.target
    ]);
    await MasterContract.waitForDeployment();

    const addresses = {
        GOATNFT_ADDRESS: GoatNft.target,
        PONGTOKEN_ADDRESS: PongToken.target,
        TOURNAMENTNFT_ADDRESS: TournamentNft.target,
        MASTERCONTRACT_ADDRESS: MasterContract.target
    };

    fs.writeFileSync(contractsFile, JSON.stringify(addresses, null, 2));
    console.log("✅ Contracts deployed and saved to", contractsFile);
}

function launchBackend() {
    console.log("🚀 Starting backend server...");

    const backend = spawn('node', ['backend-blockchain/server.js'], {
        stdio: 'inherit',
        env: { ...process.env }
    });

    backend.on('exit', (code) => {
        console.log(`🔚 Backend server exited with code ${code}`);
    });
}

(async () => {
    try {
        await deployIfNeeded();
        launchBackend();
    } catch (err) {
        console.error("❌ Failed to start:", err);
        process.exit(1);
    }
})();
