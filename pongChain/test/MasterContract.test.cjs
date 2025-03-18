const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MasterContract", function () {
    let masterContract, goatNft, matchManager, pongToken, tournamentNft;
    let owner, player1, player2;

    beforeEach(async function () {
        [owner, player1, player2] = await ethers.getSigners();

        const GoatNftFactory = await ethers.getContractFactory("GoatNft");
        goatNft = await GoatNftFactory.deploy(owner.address, 1000);
        await goatNft.waitForDeployment();

        const MatchManagerFactory = await ethers.getContractFactory("MatchManager");
        matchManager = await MatchManagerFactory.deploy();
        await matchManager.waitForDeployment();

        const PongTokenFactory = await ethers.getContractFactory("PongToken");
        pongToken = await PongTokenFactory.deploy();
        await pongToken.waitForDeployment();
        await pongToken.transferOwnership(owner.address);

        const TournamentNftFactory = await ethers.getContractFactory("TournamentNft");
        tournamentNft = await TournamentNftFactory.deploy();
        await tournamentNft.waitForDeployment();
        await tournamentNft.transferOwnership(owner.address);

        const MasterContractFactory = await ethers.getContractFactory("MasterContract");
        masterContract = await MasterContractFactory.deploy(
            await goatNft.getAddress(),
            await matchManager.getAddress(),
            await pongToken.getAddress(),
            await tournamentNft.getAddress()
        );
        await masterContract.waitForDeployment();
    });

    it("Should correctly initialize contract addresses", async function () {
        expect(await masterContract.goatNft()).to.equal(await goatNft.getAddress());
        expect(await masterContract.matchManager()).to.equal(await matchManager.getAddress());
        expect(await masterContract.pongToken()).to.equal(await pongToken.getAddress());
        expect(await masterContract.tournamentNft()).to.equal(await tournamentNft.getAddress());
    });

    it("Should initialize tournamentTokenId to 1", async function () {
        expect(await masterContract.tournamentTokenId()).to.equal(1);
    });

    it("Should correctly set the owner", async function () {
        expect(await masterContract.owner()).to.equal(owner.address);
    });

    it("Should add a player and assign tokens", async function () {
        await masterContract.addPlayer("Alice", player1.address);
        expect(await masterContract.getPlayerAddress("Alice")).to.equal(player1.address);
    });

    it("Should mint tokens to player", async function () {
        await pongToken.mint(player1.address, 100);
        expect(await pongToken.balanceOf(player1.address)).to.equal(100);
    });

    it("Should transfer tokens from loser to winner", async function () {
        await pongToken.mint(player1.address, 100);
        await pongToken.mint(player2.address, 100);
        await pongToken.connect(player1).approve(await masterContract.getAddress(), 10);
        await pongToken.connect(player2).approve(await masterContract.getAddress(), 10);

        await masterContract.tokensFromLoserToWinner(player1.address, player2.address, player1.address);
        expect(await pongToken.balanceOf(player1.address)).to.equal(110);
        expect(await pongToken.balanceOf(player2.address)).to.equal(90);
    });

    it("Should return the correct player address", async function () {
        await masterContract.addPlayer("Bob", player2.address);
        expect(await masterContract.getPlayerAddress("Bob")).to.equal(player2.address);
    });

    it("Should return the correct goat balance", async function () {
        expect(await masterContract.getGoatBalance(pongToken.getAddress())).to.equal(await goatNft.getGoatBalance(pongToken.getAddress()));
    });

    it("Should mint a tournament NFT", async function () {
        await masterContract.mintTournamentNft(player1.address, 1);
        expect(await tournamentNft.balanceOf(player1.address)).to.equal(1);
    });

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
