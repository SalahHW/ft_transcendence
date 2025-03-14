const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PongToken", function () {
    let pongToken;
    let owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        const PongTokenFactory = await ethers.getContractFactory("PongToken");
        pongToken = await PongTokenFactory.deploy();
        await pongToken.waitForDeployment();
    });

    it("should have the correct name and symbol", async function () {
        expect(await pongToken.name()).to.equal("PongToken");
        expect(await pongToken.symbol()).to.equal("PONG");
    });

    it("should set the deployer as the owner and minter", async function () {
        expect(await pongToken.owner()).to.equal(owner.address);
        expect(await pongToken.minter()).to.equal(owner.address);
    });

    it("should allow the owner to mint tokens", async function () {
        const mintAmount = ethers.parseEther("1000");
        await expect(pongToken.connect(owner).mint(addr1.address, mintAmount))
            .to.emit(pongToken, "Transfer")
            .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);
        expect(await pongToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("should revert when a non-owner tries to mint tokens", async function () {
        const mintAmount = ethers.parseEther("1000");
        await expect(pongToken.connect(addr1).mint(addr1.address, mintAmount))
            .to.be.reverted;
    });

    it("should allow the owner to burn tokens", async function () {
        // Mint tokens to addr1 first
        const mintAmount = ethers.parseEther("1000");
        await pongToken.connect(owner).mint(addr1.address, mintAmount);
        expect(await pongToken.balanceOf(addr1.address)).to.equal(mintAmount);

        // Owner burns some tokens from addr1
        const burnAmount = ethers.parseEther("500");
        await expect(pongToken.connect(owner).burnTokens(addr1.address, burnAmount))
            .to.emit(pongToken, "Transfer")
            .withArgs(addr1.address, ethers.ZeroAddress, burnAmount);
        // Use standard BigInt subtraction since mintAmount and burnAmount are BigInts
        expect(await pongToken.balanceOf(addr1.address)).to.equal(mintAmount - burnAmount);
    });

    it("should revert when a non-owner tries to burn tokens", async function () {
        // Mint tokens to addr1 first
        const mintAmount = ethers.parseEther("1000");
        await pongToken.connect(owner).mint(addr1.address, mintAmount);

        // Attempt to burn tokens from addr1 with a non-owner account
        const burnAmount = ethers.parseEther("500");
        await expect(pongToken.connect(addr1).burnTokens(addr1.address, burnAmount))
            .to.be.reverted;
    });
});
