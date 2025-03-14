const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("MatchManager", function () {
    let matchManager;
    let owner, player1, player2, nonOwner;

    beforeEach(async function () {
        [owner, player1, player2, nonOwner] = await ethers.getSigners();
        const MatchManagerFactory = await ethers.getContractFactory("MatchManager");
        matchManager = await MatchManagerFactory.deploy();
        await matchManager.waitForDeployment();
    });

    it("should have the correct stake constant", async function () {
        // The STAKE constant should be 10e18 (i.e., 10 tokens with 18 decimals)
        expect(await matchManager.STAKE()).to.equal(ethers.parseEther("10"));
    });

    it("should revert if the winner is not one of the players", async function () {
        // Passing nonOwner as the winner should revert with "Invalid winner"
        await expect(
            matchManager.reportMatchResult1v1(player1.address, player2.address, nonOwner.address)
        ).to.be.revertedWith("Invalid winner");
    });

    it("should allow the owner to report a match result and emit the event", async function () {
        // Owner reporting the match result with player1 as the winner
        await expect(
            matchManager.reportMatchResult1v1(player1.address, player2.address, player1.address)
        )
            .to.emit(matchManager, "MatchReported")
            .withArgs(player1.address, player2.address, player1.address, anyValue);
    });

    it("should only allow the owner to call reportMatchResult1v1", async function () {
        // A non-owner should not be able to call reportMatchResult1v1
        await expect(
            matchManager.connect(nonOwner).reportMatchResult1v1(player1.address, player2.address, player1.address)
        ).to.be.reverted;
    });
});
