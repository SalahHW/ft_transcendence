const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TournamentNft", function () {
    let TournamentNft, tournamentNft, owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy the contract
        TournamentNft = await ethers.getContractFactory("TournamentNft");
        tournamentNft = await TournamentNft.deploy();
        await tournamentNft.waitForDeployment();
    });

    it("should initialize correctly", async function () {
        expect(await tournamentNft.nextTokenId()).to.equal(1);
    });

    it("should allow the owner to mint a tournament NFT", async function () {
        await tournamentNft.connect(owner).mintTournamentNft(addr1.address, 1001);
        expect(await tournamentNft.ownerOf(1)).to.equal(addr1.address);
        expect(await tournamentNft.tournamentIds(1)).to.equal(1001);
    });

    it("should emit a TournamentNftMinted event when minting", async function () {
        await expect(tournamentNft.connect(owner).mintTournamentNft(addr1.address, 1001))
            .to.emit(tournamentNft, "TournamentNftMinted")
            .withArgs(addr1.address, 1, 1001);
    });

    it("should not allow non-owners to mint a tournament NFT", async function () {
        try {
            await tournamentNft.connect(addr1).mintTournamentNft(addr2.address, 1002);
            expect.fail("Transaction should have failed but succeeded");
        } catch (error) {
            expect(error.message).to.include("revert");
        }
    });

    it("should not allow transfer of the NFT", async function () {
        await tournamentNft.connect(owner).mintTournamentNft(addr1.address, 1001);
        try {
            await tournamentNft.connect(addr1)["safeTransferFrom(address,address,uint256)"](addr1.address, addr2.address, 1);
            expect.fail("Transaction should have failed but succeeded");
        } catch (error) {
            expect(error.message).to.include("revert");
        }
    });
});
