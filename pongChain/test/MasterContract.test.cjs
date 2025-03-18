const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MasterContract", function () {
    let masterContract, goatNft, matchManager, pongToken, tournamentNft;
    let owner, player1, player2;

    beforeEach(async function () {
        [owner, player1, player2] = await ethers.getSigners();

        // Déploiement des contrats dépendants
        const GoatNftFactory = await ethers.getContractFactory("GoatNft");
        goatNft = await GoatNftFactory.deploy(owner.address, 1000);
        await goatNft.waitForDeployment();

        const MatchManagerFactory = await ethers.getContractFactory("MatchManager");
        matchManager = await MatchManagerFactory.deploy();
        await matchManager.waitForDeployment();

        const PongTokenFactory = await ethers.getContractFactory("PongToken");
        pongToken = await PongTokenFactory.deploy();
        await pongToken.waitForDeployment();

        const TournamentNftFactory = await ethers.getContractFactory("TournamentNft");
        tournamentNft = await TournamentNftFactory.deploy();
        await tournamentNft.waitForDeployment();

        // Déploiement du MasterContract
        const MasterContractFactory = await ethers.getContractFactory("MasterContract");
        masterContract = await MasterContractFactory.deploy(
            await goatNft.getAddress(),
            await matchManager.getAddress(),
            await pongToken.getAddress(),
            await tournamentNft.getAddress()
        );
        await masterContract.waitForDeployment();

        // Transfert de propriété des sous-contrats à MasterContract
        await goatNft.transferOwnership(await masterContract.getAddress());
        await pongToken.transferOwnership(await masterContract.getAddress());
        await tournamentNft.transferOwnership(await masterContract.getAddress());
        await matchManager.transferOwnership(await masterContract.getAddress());

        await pongToken.connect(masterContract).updateMinter(await masterContract.getAddress());
    });

    // Test de l'initialisation
    it("Should correctly initialize contract addresses", async function () {
        expect(await masterContract.goatNft()).to.equal(await goatNft.getAddress());
        expect(await masterContract.matchManager()).to.equal(await matchManager.getAddress());
        expect(await masterContract.pongToken()).to.equal(await pongToken.getAddress());
        expect(await masterContract.tournamentNft()).to.equal(await tournamentNft.getAddress());
    });

    // Vérification que MasterContract est bien propriétaire des autres contrats
    it("Should be the owner of all dependent contracts", async function () {
        expect(await goatNft.owner()).to.equal(await masterContract.getAddress());
        expect(await pongToken.owner()).to.equal(await masterContract.getAddress());
        expect(await tournamentNft.owner()).to.equal(await masterContract.getAddress());
    });

    // Test du mint et de l'ajout d'un joueur
    it("Should add a player and assign tokens", async function () {
        await masterContract.addPlayer("Alice", player1.address);
        expect(await masterContract.getPlayerAddress("Alice")).to.equal(player1.address);
    });

    // Test du mint de tokens
    it("Should mint tokens to player", async function () {
        await pongToken.mint(player1.address, 100);
        expect(await pongToken.balanceOf(player1.address)).to.equal(100);
    });

    // Test du transfert de tokens entre joueurs après une victoire
    it("Should transfer tokens from loser to winner", async function () {
        await pongToken.mint(player1.address, 100);
        await pongToken.mint(player2.address, 100);
        await pongToken.connect(player1).approve(await masterContract.getAddress(), 10);
        await pongToken.connect(player2).approve(await masterContract.getAddress(), 10);

        await masterContract.tokensFromLoserToWinner(player1.address, player2.address, player1.address);
        expect(await pongToken.balanceOf(player1.address)).to.equal(110);
        expect(await pongToken.balanceOf(player2.address)).to.equal(90);
    });

    // Vérification de la récupération de l'adresse d'un joueur
    it("Should return the correct player address", async function () {
        await masterContract.addPlayer("Bob", player2.address);
        expect(await masterContract.getPlayerAddress("Bob")).to.equal(player2.address);
    });

    // Vérification du solde GoatNft
    it("Should return the correct goat balance", async function () {
        expect(await masterContract.getGoatBalance(pongToken.getAddress())).to.equal(
            await goatNft.getGoatBalance(pongToken.getAddress())
        );
    });

    // Test du mint d'un NFT de tournoi
    it("Should mint a tournament NFT", async function () {
        await masterContract.mintTournamentNft(player1.address, 1);
        expect(await tournamentNft.balanceOf(player1.address)).to.equal(1);
    });

    // Test du rapport de match et du transfert de tokens
    it("Should report a match result and transfer tokens", async function () {
        await masterContract.addPlayer("Alice", player1.address);
        await masterContract.addPlayer("Bob", player2.address);
        await pongToken.mint(player1.address, 100);
        await pongToken.mint(player2.address, 100);
        await pongToken.connect(player1).approve(await masterContract.getAddress(), 10);
        await pongToken.connect(player2).approve(await masterContract.getAddress(), 10);

        await masterContract.reportMatchResult(1, "Alice", "Bob", player1.address);
        expect(await pongToken.balanceOf(player1.address)).to.equal(110);
        expect(await pongToken.balanceOf(player2.address)).to.equal(90);
    });
});
