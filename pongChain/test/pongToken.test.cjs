const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PongToken Contract", function () {
    let owner, addr1, pongToken;

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();

        const PongToken = await ethers.getContractFactory("PongToken");
        pongToken = await PongToken.connect(owner).deploy();
        await pongToken.waitForDeployment();
    });

    it("should have correct name and symbol", async function () {
        expect(await pongToken.name()).to.equal("PongToken");
        expect(await pongToken.symbol()).to.equal("PONG");
    });

    it("mint should revert if called by non-owner", async function () {
        await expect(
            pongToken.connect(addr1).mint(await addr1.getAddress(), 100)
        ).to.be.reverted;
    });

    it("owner can mint tokens successfully", async function () {
        await pongToken.mint(await addr1.getAddress(), 500);
        const balance = await pongToken.balanceOf(await addr1.getAddress());
        expect(balance).to.equal(500);
    });

    it("burn should revert if called by non-owner", async function () {
        await expect(
            pongToken.connect(addr1).burn(await addr1.getAddress(), 50)
        ).to.be.reverted;
    });

    it("owner can burn tokens from any address", async function () {
        await pongToken.mint(await addr1.getAddress(), 1000);
        await pongToken.burn(await addr1.getAddress(), 400);
        expect(await pongToken.balanceOf(await addr1.getAddress())).to.equal(600);
    });
});
