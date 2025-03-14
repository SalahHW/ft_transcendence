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

    it("doit définir correctement le GOAT initial et son solde", async function () {
        expect(await goatNft.ownerOf(TOKEN_ID)).to.equal(initialGoat.address);
        expect(await goatNft.goatBalance()).to.equal(initialBalance);
        expect(await goatNft.owner()).to.equal(initialGoat.address);
    });

    it("doit permettre seulement au propriétaire de définir l'authorizedUpdater", async function () {
        // initialGoat (propriétaire) peut définir authorizedUpdater
        await goatNft.connect(initialGoat).setAuthorizedUpdater(authorizedUpdater.address);
        expect(await goatNft.authorizedUpdater()).to.equal(authorizedUpdater.address);

        // Un autre compte ne doit pas pouvoir définir authorizedUpdater
        await expect(
            goatNft.connect(other).setAuthorizedUpdater(other.address)
        ).to.be.reverted;
    });

    describe("updateGoat", function () {
        beforeEach(async function () {
            // Définir authorizedUpdater par le propriétaire
            await goatNft.connect(initialGoat).setAuthorizedUpdater(authorizedUpdater.address);
        });

        it("doit rejeter updateGoat si l'appelant n'est pas l'authorizedUpdater", async function () {
            await expect(
                goatNft.connect(other).updateGoat(newGoat.address, 2000)
            ).to.be.reverted;
        });

        it("doit mettre à jour le GOAT sans transférer le NFT si le nouveau GOAT est identique à l'actuel", async function () {
            await expect(
                goatNft.connect(authorizedUpdater).updateGoat(initialGoat.address, 1500)
            )
                .to.emit(goatNft, "GoatUpdated")
                .withArgs(initialGoat.address, initialGoat.address, 1500);

            // Le propriétaire du NFT reste inchangé et le solde est mis à jour
            expect(await goatNft.ownerOf(TOKEN_ID)).to.equal(initialGoat.address);
            expect(await goatNft.goatBalance()).to.equal(1500);
        });

        it("doit transférer le NFT et mettre à jour le solde quand le nouveau GOAT est différent", async function () {
            await expect(
                goatNft.connect(authorizedUpdater).updateGoat(newGoat.address, 2000)
            )
                .to.emit(goatNft, "GoatUpdated")
                .withArgs(initialGoat.address, newGoat.address, 2000);

            // Le propriétaire du NFT devient newGoat et le solde est mis à jour
            expect(await goatNft.ownerOf(TOKEN_ID)).to.equal(newGoat.address);
            expect(await goatNft.goatBalance()).to.equal(2000);
        });
    });

    describe("getGoatBalance", function () {
        let PongToken, pongToken;
        beforeEach(async function () {
            const PongTokenFactory = await ethers.getContractFactory("PongToken");
            pongToken = await PongTokenFactory.deploy();
            await pongToken.waitForDeployment(); // Attendre que le contrat soit déployé

            const mintAmount = ethers.parseEther("1000");
            await pongToken.mint(initialGoat.address, mintAmount);
        });

        it("doit retourner le solde du GOAT actuel pour l'ERC20 donné", async function () {
            // Utilisez pongToken.target pour obtenir l'adresse déployée
            const balanceFromContract = await goatNft.getGoatBalance(pongToken.target);
            const actualBalance = await pongToken.balanceOf(initialGoat.address);
            expect(balanceFromContract).to.equal(actualBalance);
        });
    });

});
