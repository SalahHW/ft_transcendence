const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PongToken", function () {
    let PongToken, pongToken, owner, addr1, addr2;

    beforeEach(async function () {
        PongToken = await ethers.getContractFactory("PongToken");
        [owner, addr1, addr2] = await ethers.getSigners();
        pongToken = await PongToken.deploy();
    });

    it("Should have the correct name and symbol", async function () {
        expect(await pongToken.name()).to.equal("PongToken");
        expect(await pongToken.symbol()).to.equal("PONG");
    });

    it("Should allow the owner to mint tokens", async function () {
        await pongToken.mint(addr1.address, 1000);
        expect(await pongToken.balanceOf(addr1.address)).to.equal(1000);
    });

    it("Should not allow a non-owner to mint tokens", async function () {
        await expect(
            pongToken.connect(addr1).mint(addr2.address, 1000)
        ).to.be.revertedWithCustomError(pongToken, "OwnableUnauthorizedAccount");
    });
});
