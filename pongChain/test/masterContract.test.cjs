const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MasterContract", function () {
  let owner, player1, player2, player3;
  let goatNft, pongToken, tournamentNft, masterContract;

  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners();

    // Deploy child contracts
    const GoatNft = await ethers.getContractFactory("GoatNft");
    goatNft = await GoatNft.connect(owner).deploy();
    await goatNft.waitForDeployment();

    const PongToken = await ethers.getContractFactory("PongToken");
    pongToken = await PongToken.connect(owner).deploy();
    await pongToken.waitForDeployment();

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

    // Transfer ownership
    await goatNft.transferOwnership(await masterContract.getAddress());
    await pongToken.transferOwnership(await masterContract.getAddress());
    await tournamentNft.transferOwnership(await masterContract.getAddress());
  });

  it("constructor: should set references properly and init tournamentTokenIds=1", async function () {
    expect(await masterContract.goatNft()).to.equal(await goatNft.getAddress());
    expect(await masterContract.pongToken()).to.equal(await pongToken.getAddress());
    expect(await masterContract.tournamentNft()).to.equal(await tournamentNft.getAddress());
    expect(await masterContract.tournamentTokenIds()).to.equal(1);
  });

  describe("addPlayer", function () {
    it("should revert if non-owner calls", async function () {
      await expect(
        masterContract.connect(player1).addPlayer("P1", await player1.getAddress())
      ).to.be.reverted;
    });

    it("should add player, mint 100 tokens", async function () {
      await masterContract.addPlayer("Alice", await player1.getAddress());
      expect(await pongToken.balanceOf(await player1.getAddress())).to.equal(100);
    });

    it("should revert if player name already exists", async function () {
      await masterContract.addPlayer("Alice", await player1.getAddress());
      await expect(
        masterContract.addPlayer("Alice", await player2.getAddress())
      ).to.be.reverted;
    });
  });

  describe("getPlayerAddress", function () {
    it("should revert if non-owner calls", async function () {
      await masterContract.addPlayer("Alice", await player1.getAddress());
      await expect(
        masterContract.connect(player1).getPlayerAddress("Alice")
      ).to.be.reverted;
    });

    it("should return correct player address for name", async function () {
      await masterContract.addPlayer("Alice", await player1.getAddress());
      const addr = await masterContract.getPlayerAddress("Alice");
      expect(addr).to.equal(await player1.getAddress());
    });
  });

  describe("reportMatch", function () {
    beforeEach(async function () {
      // register 2 players
      await masterContract.addPlayer("Alice", await player1.getAddress());
      await masterContract.addPlayer("Bob", await player2.getAddress());
    });

    it("should revert if non-owner calls", async function () {
      await expect(
        masterContract
          .connect(player1)
          .reportMatch("Alice", "Bob", 1, 11, 5, await player1.getAddress())
      ).to.be.reverted;
    });

    it("should revert if player1 not registered", async function () {
      await expect(
        masterContract.reportMatch("Charlie", "Bob", 1, 10, 5, await player1.getAddress())
      ).to.be.reverted;
    });

    it("should revert if player2 not registered", async function () {
      await expect(
        masterContract.reportMatch("Alice", "Charlie", 1, 10, 5, await player1.getAddress())
      ).to.be.reverted;
    });

    it("should revert if winner=0 address", async function () {
      await expect(
        masterContract.reportMatch("Alice", "Bob", 1, 11, 3, ethers.ZeroAddress)
      ).to.be.reverted;
    });

    it("should mint +10 to winner, burn from loser, store match, emit event", async function () {
      await expect(
        masterContract.reportMatch("Alice", "Bob", 123, 11, 3, await player1.getAddress())
      ).to.emit(masterContract, "MatchReported");

      expect(await pongToken.balanceOf(await player1.getAddress())).to.equal(110);
      expect(await pongToken.balanceOf(await player2.getAddress())).to.equal(90);

      const matchStored = await masterContract.getMatchsByMatchId(123);
      expect(matchStored.winner).to.equal(await player1.getAddress());
      expect(matchStored.matchId).to.equal(123);
    });

    it("should transfer goat if winner balance > goat holder", async function () {
      await masterContract.reportMatch("Alice", "Bob", 456, 11, 3, await player1.getAddress());
      expect(await goatNft.getGoatAddress()).to.equal(await player1.getAddress());
    });

    it("should cover calculateBurnAmount branches (>=20 => burn 10, <20 => burn (bal-10), <=10 => 0)", async function () {
      for (let i = 1; i <= 8; i++) {
        await masterContract.reportMatch("Alice", "Bob", i, 5, 3, await player1.getAddress());
      }
      await masterContract.reportMatch("Alice", "Bob", 9, 5, 3, await player1.getAddress());
      expect(await pongToken.balanceOf(await player2.getAddress())).to.equal(10);

      await masterContract.reportMatch("Alice", "Bob", 10, 5, 3, await player1.getAddress());
      expect(await pongToken.balanceOf(await player2.getAddress())).to.equal(10);
    });
  });

  describe("getMatchsByX", function () {
    beforeEach(async function () {
      await masterContract.addPlayer("Alice", await player1.getAddress());
      await masterContract.addPlayer("Bob", await player2.getAddress());
      await masterContract.reportMatch("Alice", "Bob", 1, 5, 3, await player1.getAddress());
      await masterContract.reportMatch("Alice", "Bob", 2, 2, 5, await player2.getAddress());
    });

    it("getMatchsByPlayer reverts if none found for that name ? let's do with a name not used", async function () {
      await expect(masterContract.getMatchsByPlayer("Charlie")).to.be.reverted;
    });

    it("getMatchsByPlayer returns correct array for 'Alice'", async function () {
      const arr = await masterContract.getMatchsByPlayer("Alice");
      expect(arr.length).to.equal(2);
    });

    it("getMatchsByWinner reverts if none found", async function () {
      await expect(masterContract.getMatchsByWinner(await player3.getAddress())).to.be.reverted;
    });

    it("getMatchsByWinner returns correct matches for Bob", async function () {
      const bobMatches = await masterContract.getMatchsByWinner(await player2.getAddress());
      expect(bobMatches.length).to.equal(1);
      expect(bobMatches[0].matchId).to.equal(2);
    });

    it("getMatchsByMatchId reverts if not found", async function () {
      await expect(masterContract.getMatchsByMatchId(9999)).to.be.reverted;
    });

    it("getMatchsByMatchId returns the correct match", async function () {
      const m1 = await masterContract.getMatchsByMatchId(1);
      expect(m1.matchId).to.equal(1);
    });
  });

  describe("reportTournament / getTournamentByX", function () {
    it("reportTournament reverts if non-owner calls", async function () {
      await expect(
        masterContract.connect(player1).reportTournament(1111, [], await player1.getAddress())
      ).to.be.reverted;
    });

    it("reportTournament mints a TNT, store, emit event", async function () {
      await masterContract.reportTournament(9999, [], await player1.getAddress());
      expect(await tournamentNft.ownerOf(1)).to.equal(await player1.getAddress());
    });

    it("getTournamentById reverts if not found", async function () {
      await expect(masterContract.getTournamentById(9999)).to.be.reverted;
    });

    it("getTournamentByWinner reverts if none found", async function () {
      await expect(
        masterContract.getTournamentByWinner(await player2.getAddress())
      ).to.be.reverted;
    });

    it("getTournamentByWinner returns array of tournaments", async function () {
      await masterContract.reportTournament(111, [], await player1.getAddress());
      await masterContract.reportTournament(222, [], await player1.getAddress());
      const tList = await masterContract.getTournamentByWinner(await player1.getAddress());
      expect(tList.length).to.equal(2);
    });
  });
});
