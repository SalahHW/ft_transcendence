const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GoatNft", function () {
    let GoatNft, goatNft;
    let owner, initialGoat, authorizedUpdater, newGoat, other;
    const initialBalance = 1000;
    const TOKEN_ID = 1;

    beforeEach(async function () {
        [owner, initialGoat, authorizedUpdater, newGoat, other] = await ethers.getSigners();
        const GoatNftFactory = await ethers.getContractFactory("GoatNft");
        goatNft = await GoatNftFactory.deploy(initialGoat.address, initialBalance);
    });

    it("should correctly set the initial GOAT and its balance", async function () {
        expect(await goatNft.ownerOf(TOKEN_ID)).to.equal(initialGoat.address);
        expect(await goatNft.goatBalance()).to.equal(initialBalance);
        expect(await goatNft.owner()).to.equal(initialGoat.address);
    });

    it("should only allow the owner to set the authorized updater", async function () {
        // initialGoat (owner) can set authorizedUpdater
        await goatNft.connect(initialGoat).setAuthorizedUpdater(authorizedUpdater.address);
        expect(await goatNft.authorizedUpdater()).to.equal(authorizedUpdater.address);

        // Another account should not be able to set authorizedUpdater
        await expect(
            goatNft.connect(other).setAuthorizedUpdater(other.address)
        ).to.be.reverted;
    });

    describe("updateGoat", function () {
        beforeEach(async function () {
            // Set authorizedUpdater by the owner
            await goatNft.connect(initialGoat).setAuthorizedUpdater(authorizedUpdater.address);
        });

        it("should revert updateGoat if the caller is not the authorized updater", async function () {
            await expect(
                goatNft.connect(other).updateGoat(newGoat.address, 2000)
            ).to.be.reverted;
        });

        it("should update the GOAT without transferring the NFT if the new GOAT is the same as the current one", async function () {
            await expect(
                goatNft.connect(authorizedUpdater).updateGoat(initialGoat.address, 1500)
            )
                .to.emit(goatNft, "GoatUpdated")
                .withArgs(initialGoat.address, initialGoat.address, 1500);

            // The NFT owner remains unchanged and the balance is updated
            expect(await goatNft.ownerOf(TOKEN_ID)).to.equal(initialGoat.address);
            expect(await goatNft.goatBalance()).to.equal(1500);
        });

        it("should transfer the NFT and update the balance when the new GOAT is different", async function () {
            await expect(
                goatNft.connect(authorizedUpdater).updateGoat(newGoat.address, 2000)
            )
                .to.emit(goatNft, "GoatUpdated")
                .withArgs(initialGoat.address, newGoat.address, 2000);

            // The NFT owner becomes newGoat and the balance is updated
            expect(await goatNft.ownerOf(TOKEN_ID)).to.equal(newGoat.address);
            expect(await goatNft.goatBalance()).to.equal(2000);
        });
    });

    describe("getGoatBalance", function () {
        let PongToken, pongToken;
        beforeEach(async function () {
            const PongTokenFactory = await ethers.getContractFactory("PongToken");
            pongToken = await PongTokenFactory.deploy();
            await pongToken.waitForDeployment(); // Wait for the contract to be deployed

            const mintAmount = ethers.parseEther("1000");
            await pongToken.mint(initialGoat.address, mintAmount);
        });

        it("should return the GOAT's balance for the given ERC20 token", async function () {
            // Use pongToken.target to get the deployed address
            const balanceFromContract = await goatNft.getGoatBalance(pongToken.target);
            const actualBalance = await pongToken.balanceOf(initialGoat.address);
            expect(balanceFromContract).to.equal(actualBalance);
        });
    });
});
