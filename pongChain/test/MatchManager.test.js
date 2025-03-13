const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MatchManager with MasterContract", function () {
    let MatchManager, MasterContract, PongToken, GoatNft;
    let matchManager, masterContract, pongToken, goatNft;
    let owner, player1, player2, other;

    beforeEach(async function () {
        [owner, player1, player2, other] = await ethers.getSigners();

        PongToken = await ethers.getContractFactory("PongToken");
        pongToken = await PongToken.deploy();
        await pongToken.waitForDeployment();

        GoatNft = await ethers.getContractFactory("GoatNft");
        goatNft = await GoatNft.deploy(owner.address, 0);
        await goatNft.waitForDeployment();

        MasterContract = await ethers.getContractFactory("MasterContract");
        masterContract = await MasterContract.deploy(goatNft.target);
        await masterContract.waitForDeployment();

        await goatNft.connect(owner).setAuthorizedUpdater(masterContract.target);

        MatchManager = await ethers.getContractFactory("MatchManager");
        matchManager = await MatchManager.deploy(pongToken.target, masterContract.target);
        await matchManager.waitForDeployment();

        await masterContract.connect(owner).setMatchManager(matchManager.target);

        const fullStake = ethers.parseEther("20");

        await pongToken.mint(player1.address, fullStake);
        await pongToken.mint(player2.address, fullStake);

        await pongToken.connect(player1).approve(matchManager.target, fullStake);
        await pongToken.connect(player2).approve(matchManager.target, fullStake);
    });

    it("should initialize correctly", async function () {
        expect(await matchManager.STAKE()).to.equal(ethers.parseEther("10"));
    });

    it("should allow the owner to report a match result", async function () {
        const matchId = 1;
        const tx = await matchManager.connect(owner).reportMatchResult1v1(matchId, player1.address, player2.address, player1.address);
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt.blockNumber);

        await expect(tx).to.emit(matchManager, "MatchReported")
            .withArgs(matchId, player1.address, player2.address, player1.address, ethers.parseEther("20"), block.timestamp);
    });

    it("should not allow non-owners to report a match", async function () {
        const matchId = 1;

        await expect(
            matchManager.connect(player1).reportMatchResult1v1(matchId, player1.address, player2.address, player1.address)
        ).to.be.revertedWithCustomError(matchManager, "OwnableUnauthorizedAccount");
    });

    it("should transfer stake from both players to the winner", async function () {
        const matchId = 1;
        const initialBalance = await pongToken.balanceOf(player1.address);

        await matchManager.connect(owner).reportMatchResult1v1(matchId, player1.address, player2.address, player1.address);

        const finalBalance = await pongToken.balanceOf(player1.address);
        expect(finalBalance).to.equal(initialBalance + ethers.parseEther("10"));
    });

    it("should not allow reporting the same match twice", async function () {
        const matchId = 1;
        await matchManager.connect(owner).reportMatchResult1v1(matchId, player1.address, player2.address, player1.address);

        await expect(
            matchManager.connect(owner).reportMatchResult1v1(matchId, player1.address, player2.address, player1.address)
        ).to.be.revertedWith("Match already reported");
    });

    it("should prevent reporting a match with an invalid winner", async function () {
        const matchId = 1;

        await expect(
            matchManager.connect(owner).reportMatchResult1v1(matchId, player1.address, player2.address, other.address)
        ).to.be.revertedWith("Invalid winner");
    });

    it("should update the GOAT if the winner has the highest balance", async function () {
        const matchId = 1;
        await matchManager.connect(owner).reportMatchResult1v1(matchId, player1.address, player2.address, player1.address);

        const newGoat = await goatNft.ownerOf(1);
        expect(newGoat).to.equal(player1.address);
    });

    it("should not update the GOAT if the winner has a lower balance than the current GOAT", async function () {
        const matchId1 = 1;
        const matchId2 = 2;

        await matchManager.connect(owner).reportMatchResult1v1(matchId1, player1.address, player2.address, player1.address);
        const firstGoat = await goatNft.ownerOf(1);

        await matchManager.connect(owner).reportMatchResult1v1(matchId2, player1.address, player2.address, player2.address);
        const secondGoat = await goatNft.ownerOf(1);

        expect(secondGoat).to.equal(firstGoat);
    });
});
