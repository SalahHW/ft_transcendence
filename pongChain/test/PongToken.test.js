const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PongToken", function () {
    let PongToken, pongToken, owner, addr1, addr2;

    beforeEach(async function () {
        PongToken = await ethers.getContractFactory("PongToken");
        [owner, addr1, addr2] = await ethers.getSigners();
        pongToken = await PongToken.deploy();
    });

    it("Doit attribuer le rôle de minter au propriétaire", async function () {
        expect(await pongToken.minter()).to.equal(owner.address);
    });

    it("Doit permettre au minter de mint des tokens", async function () {
        await pongToken.mint(addr1.address, 1000);
        expect(await pongToken.balanceOf(addr1.address)).to.equal(1000);
    });

    it("Ne doit pas permettre aux autres comptes de mint", async function () {
        await expect(pongToken.connect(addr1).mint(addr2.address, 1000))
            .to.be.revertedWith("PongToken: only the minter can mint");
    });

    it("Doit permettre à un utilisateur de brûler ses propres tokens", async function () {
        // Mint des tokens pour addr1
        await pongToken.mint(addr1.address, 1000);
        expect(await pongToken.balanceOf(addr1.address)).to.equal(1000);
    
        // Addr1 brûle 500 tokens
        await pongToken.connect(addr1).burn(500);
        expect(await pongToken.balanceOf(addr1.address)).to.equal(500);
    });

    it("Le propriétaire peut brûler les tokens de n'importe quel utilisateur", async function () {
        await pongToken.mint(addr1.address, 1000);
        expect(await pongToken.balanceOf(addr1.address)).to.equal(1000);
    
        // L'owner brûle les tokens de addr1
        await pongToken.connect(owner).burnTokens(addr1.address, 500);
        expect(await pongToken.balanceOf(addr1.address)).to.equal(500);
    });
    
});
