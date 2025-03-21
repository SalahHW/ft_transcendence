const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MasterContract", function () {
  let masterContract;
  let goatNft, pongToken, tournamentNft;
  let owner, player1, player2;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    // Mock GoatNft
    const GoatNft = await ethers.getContractFactory("GoatNft");
    goatNft = await GoatNft.deploy();
    await goatNft.deployed();

    // Mock PongToken
    const PongToken = await ethers.getContractFactory("PongToken");
    pongToken = await PongToken.deploy();
    await pongToken.deployed();

    // Mock TournamentNft
    const TournamentNft = await ethers.getContractFactory("TournamentNft");
    tournamentNft = await TournamentNft.deploy();
    await tournamentNft.deployed();

    const MasterContract = await ethers.getContractFactory("MasterContract");
    masterContract = await MasterContract.deploy(
      goatNft.address,
      pongToken.address,
      tournamentNft.address
    );
    await masterContract.deployed();
  });

  describe("addPlayer", function () {
    it("should add a player and emit PlayerAdded", async function () {
      const tx = await masterContract.addPlayer("Alice", player1.address);
      await expect(tx)
        .to.emit(masterContract, "PlayerAdded")
        .withArgs("Alice", player1.address);
    });

    it("should revert if player already exists", async function () {
      await masterContract.addPlayer("Alice", player1.address);
      await expect(
        masterContract.addPlayer("Alice", player1.address)
      ).to.be.revertedWith("Player already exists");
    });
  });

  describe("reportMatch", function () {
    beforeEach(async function () {
      await masterContract.addPlayer("Alice", player1.address);
      await masterContract.addPlayer("Bob", player2.address);
    });

    it("should report a match and emit MatchReported", async function () {
      await pongToken.mint(player1.address, 100);
      await pongToken.mint(player2.address, 100);

      const tx = await masterContract.reportMatch(
        "Alice",
        "Bob",
        1,
        3,
        2,
        player1.address
      );

      await expect(tx)
        .to.emit(masterContract, "MatchReported")
        .withArgs(player1.address, player2.address, player1.address, 3, 2, 1);
    });
  });

  describe("getMatchsByMatchId", function () {
    it("should revert if match does not exist", async function () {
      await expect(masterContract.getMatchsByMatchId(999)).to.be.revertedWith(
        "Match not found"
      );
    });
  });
});
