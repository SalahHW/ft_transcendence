const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TournamentNft Contract", function () {
    let owner, addr1, tournamentNft;

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();

        const TournamentNft = await ethers.getContractFactory("TournamentNft");
        tournamentNft = await TournamentNft.connect(owner).deploy();
        await tournamentNft.waitForDeployment();
    });

    it("should have correct name and symbol", async function () {
        expect(await tournamentNft.name()).to.equal("TournamentToken");
        expect(await tournamentNft.symbol()).to.equal("TNT");
    });

    it("mintTnt should revert if called by non-owner", async function () {
        await expect(
            tournamentNft.connect(addr1).mintTnt(await addr1.getAddress(), 100)
        ).to.be.reverted;
    });

    it("owner can mintTnt successfully", async function () {
        await tournamentNft.mintTnt(await addr1.getAddress(), 777);
        expect(await tournamentNft.ownerOf(777)).to.equal(await addr1.getAddress());
    });

    it("getTracking returns winner for the minted tokenId", async function () {
        await tournamentNft.mintTnt(await addr1.getAddress(), 999);
        const tracked = await tournamentNft.getTracking(999);
        expect(tracked).to.equal(await addr1.getAddress());
    });

    it("transferring minted token by non-owner should revert (internal checkAuthorized)", async function () {
        await tournamentNft.mintTnt(await addr1.getAddress(), 55);
        await expect(
            tournamentNft
                .connect(addr1)
                .transferFrom(await addr1.getAddress(), await owner.getAddress(), 55)
        ).to.be.reverted;
    });
});
