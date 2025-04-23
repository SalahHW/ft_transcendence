const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GoatNft Contract", function () {
    let owner, addr1, goatNft;

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();

        const GoatNft = await ethers.getContractFactory("GoatNft");
        goatNft = await GoatNft.connect(owner).deploy();
        await goatNft.waitForDeployment();
    });

    it("should mint token #299 to the deployer on construction", async function () {
        const balance = await goatNft.balanceOf(await owner.getAddress());
        expect(balance).to.equal(1);
    });

    it("should set correct tokenURI for #299", async function () {
        const uri = await goatNft.tokenURI(299);
        expect(uri).to.equal(
            "ipfs://bafkreigyctqe5fb456qcfydg6pfy6zdh626eid4f5znwf6yj6rnjlzbq5a/GoatNFT.json"
        );
    });

    it("getGoatAddress should return the address that currently holds the goat", async function () {
        const goatAddress = await goatNft.getGoatAddress();
        expect(goatAddress).to.equal(await owner.getAddress());
    });

    it("transferNft should revert if called by non-owner", async function () {
        await expect(
            goatNft.connect(addr1).transferNft(await owner.getAddress(), await addr1.getAddress())
        ).to.be.reverted;
    });

    it("owner can transferNft successfully", async function () {
        await goatNft.transferNft(await owner.getAddress(), await addr1.getAddress());
        const newHolder = await goatNft.getGoatAddress();
        expect(newHolder).to.equal(await addr1.getAddress());
        expect(await goatNft.ownerOf(299)).to.equal(await addr1.getAddress());
    });

    it("tokenURI should revert if asked for a non-existent token", async function () {
        await expect(goatNft.tokenURI(999999)).to.be.reverted;
    });

    it("safeTransferFrom should revert if called by non-owner (internal checkAuthorized)", async function () {
        await expect(
            goatNft
                .connect(addr1)
                .safeTransferFrom(await owner.getAddress(), await addr1.getAddress(), 299)
        ).to.be.reverted;
    });

    it("supportsInterface should return true for ERC721", async function () {
        const ERC721_INTERFACE_ID = "0x80ac58cd";
        expect(await goatNft.supportsInterface(ERC721_INTERFACE_ID)).to.equal(true);
    });
});
