const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PongToken", function () {
    let PongToken, pongToken, owner, addr1, addr2;

    beforeEach(async function () {
        PongToken = await ethers.getContractFactory("PongToken");
        [owner, addr1, addr2] = await ethers.getSigners();
        pongToken = await PongToken.deploy();
    });

    it("Should assign the minter role to the owner", async function () {
        expect(await pongToken.minter()).to.equal(owner.address);
    });

    it("Should allow the minter to mint tokens", async function () {
        await pongToken.mint(addr1.address, 1000);
        expect(await pongToken.balanceOf(addr1.address)).to.equal(1000);
    });

    it("Should not allow other accounts to mint tokens", async function () {
        await expect(pongToken.connect(addr1).mint(addr2.address, 1000))
            .to.be.revertedWith("PongToken: only the minter can mint");
    });

    it("Should allow a user to burn their own tokens", async function () {
        await pongToken.mint(addr1.address, 1000);
        expect(await pongToken.balanceOf(addr1.address)).to.equal(1000);
    
        await pongToken.connect(addr1).burn(500);
        expect(await pongToken.balanceOf(addr1.address)).to.equal(500);
    });

    it("Should allow the owner to burn tokens from any user", async function () {
        await pongToken.mint(addr1.address, 1000);
        expect(await pongToken.balanceOf(addr1.address)).to.equal(1000);
    
        await pongToken.connect(owner).burnTokens(addr1.address, 500);
        expect(await pongToken.balanceOf(addr1.address)).to.equal(500);
    });
});
