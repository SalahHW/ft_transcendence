// test/TournamentNftFullCoverage.test.cjs
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TournamentNft Full Coverage with MasterContract (no wrapper)", function () {
    let owner, player1, player2;
    let goatNft, pongToken, tournamentNft, masterContract;

    beforeEach(async function () {
        [owner, player1, player2] = await ethers.getSigners();

        // Deploy GoatNft
        const GoatNft = await ethers.getContractFactory("GoatNft");
        goatNft = await GoatNft.connect(owner).deploy();
        await goatNft.waitForDeployment();

        // Deploy PongToken
        const PongToken = await ethers.getContractFactory("PongToken");
        pongToken = await PongToken.connect(owner).deploy();
        await pongToken.waitForDeployment();

        // Deploy TournamentNft
        const TournamentNft = await ethers.getContractFactory("TournamentNft");
        tournamentNft = await TournamentNft.connect(owner).deploy();
        await tournamentNft.waitForDeployment();

        // Deploy MasterContract
        const MasterContract = await ethers.getContractFactory("MasterContract");
        masterContract = await MasterContract.connect(owner).deploy(
            await goatNft.getAddress(),
            await pongToken.getAddress(),
            await tournamentNft.getAddress()
        );
        await masterContract.waitForDeployment();

        // Transfer ownership of TournamentNft to MasterContract
        await tournamentNft
            .connect(owner)
            .transferOwnership(await masterContract.getAddress());
    });

    it("should revert if a non-owner tries to transfer a TNT token", async function () {
        const hre = require("hardhat");
        const masterAddr = await masterContract.getAddress();

        await hre.network.provider.send("hardhat_setBalance", [
            masterAddr,
            "0x56BC75E2D63100000"
        ]);

        await hre.network.provider.send("hardhat_impersonateAccount", [masterAddr]);
        const masterSigner = await ethers.getSigner(masterAddr);

        await tournamentNft.connect(masterSigner).mintTnt(await player1.getAddress(), 111);

        await hre.network.provider.send("hardhat_stopImpersonatingAccount", [masterAddr]);

        await expect(
            tournamentNft
                .connect(player1)
                .transferFrom(await player1.getAddress(), await player2.getAddress(), 111)
        ).to.be.revertedWith("Only admin can transfer tokens");
    });

    it("should allow the MasterContract to mint and transfer a TNT (covers authorized path)", async function () {
        const hre = require("hardhat");
        const masterAddr = await masterContract.getAddress();

        await hre.network.provider.send("hardhat_setBalance", [
            masterAddr,
            "0x56BC75E2D63100000"
        ]);

        await hre.network.provider.send("hardhat_impersonateAccount", [masterAddr]);
        const masterSigner = await ethers.getSigner(masterAddr);

        await tournamentNft.connect(masterSigner).mintTnt(await player1.getAddress(), 999);

        await tournamentNft
            .connect(masterSigner)
            .transferFrom(await player1.getAddress(), await player2.getAddress(), 999);

        expect(await tournamentNft.ownerOf(999)).to.equal(await player2.getAddress());

        await hre.network.provider.send("hardhat_stopImpersonatingAccount", [masterAddr]);
    });
});
