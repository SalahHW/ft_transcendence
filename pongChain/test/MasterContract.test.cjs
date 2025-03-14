const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MasterContract Initialization", function () {
    let MasterContract, GoatNft, MatchManager, PongToken, TournamentNft;
    let masterContract, goatNft, matchManager, pongToken, tournamentNft;
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        // Déploiement des contrats dépendants
        const GoatNftFactory = await ethers.getContractFactory("GoatNft");
        goatNft = await GoatNftFactory.deploy();
        await goatNft.deployed();

        const MatchManagerFactory = await ethers.getContractFactory("MatchManager");
        matchManager = await MatchManagerFactory.deploy();
        await matchManager.deployed();

        const PongTokenFactory = await ethers.getContractFactory("PongToken");
        pongToken = await PongTokenFactory.deploy(owner.address);
        await pongToken.deployed();

        const TournamentNftFactory = await ethers.getContractFactory("TournamentNft");
        tournamentNft = await TournamentNftFactory.deploy();
        await tournamentNft.deployed();

        console.log("GoatNft deployed at:", goatNft.address);
        console.log("MatchManager deployed at:", matchManager.address);
        console.log("PongToken deployed at:", pongToken.address);
        console.log("TournamentNft deployed at:", tournamentNft.address);

        console.log("Déploiement de MasterContract avec :");
        console.log("GoatNft:", goatNft.address);
        console.log("MatchManager:", matchManager.address);
        console.log("PongToken:", pongToken.address);
        console.log("TournamentNft:", tournamentNft.address);


        // Déploiement du MasterContract
        const MasterContractFactory = await ethers.getContractFactory("MasterContract");
        masterContract = await MasterContractFactory.deploy(
            goatNft.address,
            matchManager.address,
            pongToken.address,
            tournamentNft.address
        );
        await masterContract.deployed();
    });

    it("Devrait initialiser correctement les adresses des contrats dépendants", async function () {
        expect(await masterContract.goatNft()).to.equal(goatNft.address);
        expect(await masterContract.matchManager()).to.equal(matchManager.address);
        expect(await masterContract.pongToken()).to.equal(pongToken.address);
        expect(await masterContract.tournamentNft()).to.equal(tournamentNft.address);
    });

    it("Devrait initialiser correctement tournamentTokenId à 1", async function () {
        expect(await masterContract.tournamentTokenId()).to.equal(1);
    });

    it("Devrait définir le propriétaire correctement", async function () {
        expect(await masterContract.owner()).to.equal(owner.address);
    });
});
