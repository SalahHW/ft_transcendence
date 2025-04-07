const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts", "contracts");
const ABI_OUTPUT_DIR = path.join(__dirname, "..", "backend-blockchain", "abi");

const contracts = [
    { file: "nfts/GoatNft.sol", name: "GoatNft" },
    { file: "tokens/PongToken.sol", name: "PongToken" },
    { file: "nfts/TournamentNft.sol", name: "TournamentNft" },
    { file: "MasterContract.sol", name: "MasterContract" },
];

if (!fs.existsSync(ABI_OUTPUT_DIR)) {
    fs.mkdirSync(ABI_OUTPUT_DIR);
}

for (const contract of contracts) {
    const artifactPath = path.join(ARTIFACTS_DIR, contract.file, `${contract.name}.json`);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiPath = path.join(ABI_OUTPUT_DIR, `${contract.name}.json`);
    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
    console.log(`✔ ABI exported: ${abiPath}`);
}
