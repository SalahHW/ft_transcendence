const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TournamentNft", function () {
    let tournamentNft;
    let owner, addr1, addr2;
    const tokenId = 1;
    const tournamentId = 100; // Example tournament id

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        const TournamentNftFactory = await ethers.getContractFactory("TournamentNft");
        tournamentNft = await TournamentNftFactory.deploy();
        await tournamentNft.waitForDeployment();
    });

    it("should have the correct name and symbol", async function () {
        expect(await tournamentNft.name()).to.equal("Tournament Trophy");
        expect(await tournamentNft.symbol()).to.equal("TNT");
    });

    it("should only allow the owner to mint a tournament NFT", async function () {
        // Only the contract owner can call mintTournamentNft; non-owners should revert.
        await expect(
            tournamentNft.connect(addr1).mintTournamentNft(addr1.address, tournamentId, tokenId)
        ).to.be.reverted;
    });

    it("should mint a tournament NFT and emit TournamentNftMinted event", async function () {
        // Mint NFT from the owner.
        await expect(
            tournamentNft.connect(owner).mintTournamentNft(addr1.address, tournamentId, tokenId)
        )
            .to.emit(tournamentNft, "TournamentNftMinted")
            .withArgs(addr1.address, tokenId, tournamentId);

        // Verify that the NFT is owned by addr1.
        expect(await tournamentNft.ownerOf(tokenId)).to.equal(addr1.address);
    });

    it("should not allow transfer of a tournament NFT", async function () {
        // Mint an NFT to addr1.
        await tournamentNft.connect(owner).mintTournamentNft(addr1.address, tournamentId, tokenId);

        // Attempt to transfer the NFT from addr1 to addr2 should revert.
        await expect(
            tournamentNft.connect(addr1).transferFrom(addr1.address, addr2.address, tokenId)
        ).to.be.reverted;
    });
});
