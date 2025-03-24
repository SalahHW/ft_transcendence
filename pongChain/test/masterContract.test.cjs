const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MasterContract", function () {
  let owner, player1, player2, player3, masterContract;
  let goatNft, tournamentNft, pongToken;

  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners();

    // Deploy dependencies
    const GoatNft = await ethers.getContractFactory("GoatNft");
    goatNft = await GoatNft.deploy();
    await goatNft.waitForDeployment();

    const TournamentNft = await ethers.getContractFactory("TournamentNft");
    tournamentNft = await TournamentNft.deploy();
    await tournamentNft.waitForDeployment();

    const PongToken = await ethers.getContractFactory("PongToken");
    pongToken = await PongToken.deploy();
    await pongToken.waitForDeployment();

    // Deploy MasterContract
    const MasterContract = await ethers.getContractFactory("MasterContract");
    masterContract = await MasterContract.deploy(
      await goatNft.getAddress(),
      await pongToken.getAddress(),
      await tournamentNft.getAddress()
    );
    await masterContract.waitForDeployment();

    // Transfer ownership of contracts to MasterContract
    await goatNft.transferOwnership(await masterContract.getAddress());
    await tournamentNft.transferOwnership(await masterContract.getAddress());
    await pongToken.transferOwnership(await masterContract.getAddress());
  });

  it("should add players and mint initial PongTokens", async function () {
    await masterContract.addPlayer("Alice", player1.address);
    await masterContract.addPlayer("Bob", player2.address);

    const alice = await masterContract.getPlayerAddress("Alice");
    const bob = await masterContract.getPlayerAddress("Bob");

    expect(alice).to.equal(player1.address);
    expect(bob).to.equal(player2.address);
    expect(await pongToken.balanceOf(player1.address)).to.equal(100);
    expect(await pongToken.balanceOf(player2.address)).to.equal(100);
  });

  it("should fail if player is added twice", async function () {
    await masterContract.addPlayer("Alice", player1.address);
    await expect(
      masterContract.addPlayer("Alice", player2.address)
    ).to.be.revertedWith("Player already exists");
  });

  it("should report a match and burn PongTokens from loser", async function () {
    await masterContract.addPlayer("Alice", player1.address);
    await masterContract.addPlayer("Bob", player2.address);

    await masterContract.reportMatch(
      "Alice",
      "Bob",
      1,
      11,
      3,
      player1.address // Alice wins
    );

    expect(await pongToken.balanceOf(player1.address)).to.equal(110); // +10
    expect(await pongToken.balanceOf(player2.address)).to.equal(90);  // -10
  });

  it("should transfer Goat NFT to new GOAT when surpassed", async function () {
    await masterContract.addPlayer("Alice", player1.address);
    await masterContract.addPlayer("Bob", player2.address);

    await masterContract.reportMatch("Alice", "Bob", 1, 11, 3, player1.address); // +10
    await masterContract.reportMatch("Alice", "Bob", 2, 11, 3, player1.address); // +10
    await masterContract.reportMatch("Alice", "Bob", 3, 11, 3, player1.address); // +10

    expect(await goatNft.ownerOf(299)).to.equal(player1.address);
  });

  it("should track matches by player", async function () {
    await masterContract.addPlayer("Alice", player1.address);
    await masterContract.addPlayer("Bob", player2.address);

    await masterContract.reportMatch("Alice", "Bob", 1, 11, 3, player1.address);
    await masterContract.reportMatch("Alice", "Bob", 2, 11, 3, player2.address);

    const matchesAlice = await masterContract.getMatchsByPlayer("Alice");
    expect(matchesAlice.length).to.equal(2);
  });

  it("should retrieve match by ID and winner", async function () {
    await masterContract.addPlayer("Alice", player1.address);
    await masterContract.addPlayer("Bob", player2.address);

    await masterContract.reportMatch("Alice", "Bob", 1, 11, 3, player1.address);
    const match = await masterContract.getMatchsByMatchId(1);
    expect(match.winner).to.equal(player1.address);

    const wonMatches = await masterContract.getMatchsByWinner(player1.address);
    expect(wonMatches.length).to.equal(1);
  });

  it("should report a tournament and mint TNT NFT", async function () {
    await masterContract.addPlayer("Alice", player1.address);
    await masterContract.addPlayer("Bob", player2.address);

    await masterContract.reportMatch("Alice", "Bob", 1, 11, 3, player1.address);
    await masterContract.reportTournament(
      Math.floor(Date.now() / 1000),
      [1],
      player1.address
    );

    const tournament = await masterContract.getTournamentById(1);
    expect(tournament.winner).to.equal(player1.address);

    const won = await tournamentNft.getTracking(1);
    expect(won).to.equal(player1.address);
  });

  it("should retrieve tournaments by winner", async function () {
    await masterContract.addPlayer("Alice", player1.address);
    await masterContract.addPlayer("Bob", player2.address);

    await masterContract.reportMatch("Alice", "Bob", 1, 11, 3, player1.address);
    await masterContract.reportTournament(
      Math.floor(Date.now() / 1000),
      [1],
      player1.address
    );

    const wonTournaments = await masterContract.getTournamentByWinner(player1.address);
    expect(wonTournaments.length).to.equal(1);
  });

  it("should revert on unauthorized NFT transfer", async function () {
    await expect(
      goatNft.connect(player1).transferFrom(owner.address, player1.address, 299)
    ).to.be.revertedWith("Only admin can transfer tokens");
  });

  it("should revert match if player not registered", async function () {
    await masterContract.addPlayer("Alice", player1.address);
    await expect(
      masterContract.reportMatch("Alice", "Bob", 1, 11, 3, player1.address)
    ).to.be.revertedWith("Player2 not registered");
  });

  it("should revert if winner is zero address", async function () {
    await masterContract.addPlayer("Alice", player1.address);
    await masterContract.addPlayer("Bob", player2.address);
    await expect(
      masterContract.reportMatch("Alice", "Bob", 1, 11, 3, ethers.ZeroAddress)
    ).to.be.revertedWith("Winner address is invalid");
  });
});
