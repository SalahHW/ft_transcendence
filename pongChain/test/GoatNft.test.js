const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GoatNft", function () {
    let GoatNft, goatNft, owner, addr1, addr2, authorizedUpdater;

    beforeEach(async function () {
        [owner, addr1, addr2, authorizedUpdater] = await ethers.getSigners();

        // Deploy the contract with an initial owner and balance of 1000
        GoatNft = await ethers.getContractFactory("GoatNft");
        goatNft = await GoatNft.deploy(owner.address, 1000);
        await goatNft.waitForDeployment();
    });

    it("should initialize the NFT correctly", async function () {
        expect(await goatNft.ownerOf(1)).to.equal(owner.address);
        expect(await goatNft.goatBalance()).to.equal(1000);
    });

    it("should allow the owner to set the authorizedUpdater", async function () {
        await goatNft.connect(owner).setAuthorizedUpdater(authorizedUpdater.address);
        expect(await goatNft.authorizedUpdater()).to.equal(authorizedUpdater.address);
    });

    it("should not allow a non-owner to set the authorizedUpdater", async function () {
        try {
            await goatNft.connect(addr1).setAuthorizedUpdater(addr2.address);
            expect.fail("Transaction should have failed but succeeded");
        } catch (error) {
            expect(error.message).to.include("revert");
        }
    });

    it("should allow the authorizedUpdater to update the GOAT", async function () {
        await goatNft.connect(owner).setAuthorizedUpdater(authorizedUpdater.address);
        
        await goatNft.connect(authorizedUpdater).updateGoat(addr1.address, 2000);
        
        expect(await goatNft.ownerOf(1)).to.equal(addr1.address);
        expect(await goatNft.goatBalance()).to.equal(2000);
    });

    it("should not allow an unauthorized user to update the GOAT", async function () {
        try {
            await goatNft.connect(addr1).updateGoat(addr2.address, 1500);
            expect.fail("Transaction should have failed but succeeded");
        } catch (error) {
            expect(error.message).to.include("revert");
        }
    });

    it("should not allow direct transfer of the NFT", async function () {
        try {
            await goatNft.connect(owner)["safeTransferFrom(address,address,uint256)"](owner.address, addr1.address, 1);
            expect.fail("Transaction should have failed but succeeded");
        } catch (error) {
            expect(error.message).to.include("revert");
        }
    });

    it("should emit a GoatUpdated event when the GOAT is updated", async function () {
        await goatNft.connect(owner).setAuthorizedUpdater(authorizedUpdater.address);

        await expect(goatNft.connect(authorizedUpdater).updateGoat(addr1.address, 2000))
            .to.emit(goatNft, "GoatUpdated")
            .withArgs(owner.address, addr1.address, 2000);
    });
});
