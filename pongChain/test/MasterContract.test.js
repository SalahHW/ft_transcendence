const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MasterContract", function () {
    let MasterContract, MatchManager, GoatNft, PongToken;
    let masterContract, matchManager, goatNft, pongToken;
    let owner, player1, player2, other;

    beforeEach(async function () {
        [owner, player1, player2, other] = await ethers.getSigners();

        // Déploiement de PongToken
        const PongTokenFactory = await ethers.getContractFactory("PongToken");
        pongToken = await PongTokenFactory.deploy();
        await pongToken.waitForDeployment();

        // Déploiement de GoatNft
        const GoatNftFactory = await ethers.getContractFactory("GoatNft");
        goatNft = await GoatNftFactory.deploy(owner.address, 0);
        await goatNft.waitForDeployment();

        // Déploiement de MasterContract
        const MasterContractFactory = await ethers.getContractFactory("MasterContract");
        masterContract = await MasterContractFactory.deploy(goatNft.target);
        await masterContract.waitForDeployment();

        // Déploiement de MatchManager
        const MatchManagerFactory = await ethers.getContractFactory("MatchManager");
        matchManager = await MatchManagerFactory.deploy(pongToken.target, masterContract.target);
        await matchManager.waitForDeployment();

        // Autoriser MasterContract à mettre à jour GoatNft
        await goatNft.connect(owner).setAuthorizedUpdater(masterContract.target);

        // Associer MatchManager au MasterContract
        await masterContract.connect(owner).setMatchManager(matchManager.target);

        // Assurer que player1 a assez de tokens et les approuve
        const fullStake = ethers.parseEther("30");
        await pongToken.mint(player1.address, fullStake);
        await pongToken.mint(player2.address, fullStake);
        await pongToken.connect(player1).approve(matchManager.target, fullStake);
        await pongToken.connect(player2).approve(matchManager.target, fullStake);
    });

    it("should initialize correctly", async function () {
        expect(await masterContract.goatNft()).to.equal(goatNft.target);
    });

    it("should allow the owner to set the MatchManager", async function () {
        expect(await masterContract.matchManager()).to.equal(matchManager.target);
    });

    it("should not allow non-owners to set the MatchManager", async function () {
        await expect(
            masterContract.connect(other).setMatchManager(other.address)
        ).to.be.revertedWithCustomError(masterContract, "OwnableUnauthorizedAccount");
    });

    it("should allow the MatchManager to update the GOAT in GoatNft", async function () {
        // Player 1 gagne un match et devient le GOAT
        await matchManager.connect(owner).reportMatchResult1v1(1, player1.address, player2.address, player1.address);

        console.log("GOAT Balance after update:", await goatNft.goatBalance());

        expect(await goatNft.ownerOf(1)).to.equal(player1.address);
        expect(await goatNft.getGoatBalance(pongToken.target)).to.equal(ethers.parseEther("40"));

    });

    it("should not allow a non-authorized contract or user to update the GOAT", async function () {
        await expect(
            goatNft.connect(other).updateGoat(player2.address, 1500)
        ).to.be.revertedWith("GoatNft: caller not authorized");
    });

    it("should return the current GOAT balance", async function () {
        // Player 1 gagne un match et devient le GOAT
        await matchManager.connect(owner).reportMatchResult1v1(1, player1.address, player2.address, player1.address);

        const expectedGoatBalance = await pongToken.balanceOf(await goatNft.ownerOf(1));
        expect(await masterContract.getGoatBalance(pongToken.target)).to.equal(expectedGoatBalance);
        
    });
});
