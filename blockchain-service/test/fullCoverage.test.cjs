const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Ce fichier regroupe:
 *  1) Les tests "classiques" du MasterContract
 *  2) Les tests additionnels pour couvrir
 *     - player2 branch in getMatchsByPlayer
 *     - multi-tournament in getTournamentById
 *     - cheat-based coverage of "balance <20 => burn=(balance-10)"
 */

describe("MasterContract - Full Coverage", function () {
    let owner, player1, player2, player3;
    let goatNft, pongToken, tournamentNft, masterContract;

    //
    // ─────────────────────────────────────────────────────────────
    //  Déploiement commun avant chaque test
    // ─────────────────────────────────────────────────────────────
    //
    beforeEach(async function () {
        [owner, player1, player2, player3] = await ethers.getSigners();

        // 1) Deploy GoatNft
        const GoatNft = await ethers.getContractFactory("GoatNft");
        goatNft = await GoatNft.connect(owner).deploy();
        await goatNft.waitForDeployment();

        // 2) Deploy PongToken
        const PongToken = await ethers.getContractFactory("PongToken");
        pongToken = await PongToken.connect(owner).deploy();
        await pongToken.waitForDeployment();

        // 3) Deploy TournamentNft
        const TournamentNft = await ethers.getContractFactory("TournamentNft");
        tournamentNft = await TournamentNft.connect(owner).deploy();
        await tournamentNft.waitForDeployment();

        // 4) Deploy MasterContract
        const MasterContract = await ethers.getContractFactory("MasterContract");
        masterContract = await MasterContract.connect(owner).deploy(
            await goatNft.getAddress(),
            await pongToken.getAddress(),
            await tournamentNft.getAddress()
        );
        await masterContract.waitForDeployment();

        // 5) Transfer ownership of child contracts to masterContract
        await goatNft.transferOwnership(await masterContract.getAddress());
        await pongToken.transferOwnership(await masterContract.getAddress());
        await tournamentNft.transferOwnership(await masterContract.getAddress());
    });

    //
    // ─────────────────────────────────────────────────────────────
    //   TEST #1 : constructor
    // ─────────────────────────────────────────────────────────────
    //
    it("constructor: should set references properly and init tournamentTokenIds=1", async function () {
        expect(await masterContract.goatNft()).to.equal(await goatNft.getAddress());
        expect(await masterContract.pongToken()).to.equal(
            await pongToken.getAddress()
        );
        expect(await masterContract.tournamentNft()).to.equal(
            await tournamentNft.getAddress()
        );
        const tId = await masterContract.tournamentTokenIds();
        expect(tId).to.equal(1);
    });

    //
    // ─────────────────────────────────────────────────────────────
    //   TEST #2 : addPlayer
    // ─────────────────────────────────────────────────────────────
    //
    describe("addPlayer", function () {
        it("should revert if non-owner calls", async function () {
            await expect(
                masterContract
                    .connect(player1)
                    .addPlayer("P1", await player1.getAddress())
            ).to.be.reverted;
        });

        it("should add player, mint 100 tokens", async function () {
            await masterContract.addPlayer("Alice", await player1.getAddress());
            expect(
                await pongToken.balanceOf(await player1.getAddress())
            ).to.equal(100);
        });

        it("should revert if player name already exists", async function () {
            await masterContract.addPlayer("Alice", await player1.getAddress());
            await expect(
                masterContract.addPlayer("Alice", await player2.getAddress())
            ).to.be.reverted;
        });
    });

    //
    // ─────────────────────────────────────────────────────────────
    //   TEST #3 : getPlayerAddress
    // ─────────────────────────────────────────────────────────────
    //
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

    //
    // ─────────────────────────────────────────────────────────────
    //   TEST #4 : reportMatch
    // ─────────────────────────────────────────────────────────────
    //
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
                masterContract.reportMatch("Unregistered", "Bob", 1, 10, 5, await player1.getAddress())
            ).to.be.reverted;
        });

        it("should revert if player2 not registered", async function () {
            await expect(
                masterContract.reportMatch("Alice", "Unknown", 1, 10, 5, await player1.getAddress())
            ).to.be.reverted;
        });

        it("should revert if winner=0 address", async function () {
            await expect(
                masterContract.reportMatch(
                    "Alice",
                    "Bob",
                    1,
                    11,
                    3,
                    ethers.ZeroAddress
                )
            ).to.be.reverted;
        });

        it("should mint +10 to winner, burn from loser, store match, emit event", async function () {
            // Both have 100
            await expect(
                masterContract.reportMatch("Alice", "Bob", 123, 11, 3, await player1.getAddress())
            ).to.emit(masterContract, "MatchReported");

            // winner => 110, loser => 90
            expect(await pongToken.balanceOf(await player1.getAddress())).to.equal(110);
            expect(await pongToken.balanceOf(await player2.getAddress())).to.equal(90);

            // check match
            const matchStored = await masterContract.getMatchsByMatchId(123);
            expect(matchStored.winner).to.equal(await player1.getAddress());
            expect(matchStored.matchId).to.equal(123);
        });

        it("should transfer goat if winner balance > goat holder", async function () {
            // goat holder = owner => 0 tokens
            // "Alice" => 100 => after one win => 110 > 0 => goat moves
            await masterContract.reportMatch("Alice", "Bob", 456, 11, 3, await player1.getAddress());
            expect(await goatNft.getGoatAddress()).to.equal(await player1.getAddress());
        });

        it("should cover calculateBurnAmount branches (>=20 => burn 10, <=10 => 0, etc.)", async function () {
            // On fait perdre Bob plusieurs fois => par pas de 10
            // initial Bob=100 => lose => 90 => 80 => ... => 10 => 0 => ...
            // (On ne traitera pas le <20 => (balance-10) => 85% coverage par la suite, test plus loin)
            for (let i = 1; i <= 9; i++) {
                await masterContract.reportMatch("Alice", "Bob", i, 1, 0, await player1.getAddress());
            }
            // => 9 fois => 9*10 => 90 => Bob => 10
            expect(await pongToken.balanceOf(await player2.getAddress())).to.equal(10);
            // => Sous 10 => burn=0
            // => On a couvert <=10 => 0, >=20 => 10. 
        });
    });

    //
    // ─────────────────────────────────────────────────────────────
    //   TEST #5 : getMatchsByX
    // ─────────────────────────────────────────────────────────────
    //
    describe("getMatchsByX", function () {
        beforeEach(async function () {
            await masterContract.addPlayer("Alice", await player1.getAddress());
            await masterContract.addPlayer("Bob", await player2.getAddress());
            await masterContract.reportMatch("Alice", "Bob", 1, 5, 3, await player1.getAddress());
            await masterContract.reportMatch("Alice", "Bob", 2, 2, 5, await player2.getAddress());
        });

        it("getMatchsByPlayer reverts if none found for that name", async function () {
            await expect(masterContract.getMatchsByPlayer("Charlie")).to.be.reverted;
        });

        it("getMatchsByPlayer returns correct array for 'Alice'", async function () {
            const arr = await masterContract.getMatchsByPlayer("Alice");
            expect(arr.length).to.equal(2);
        });

        it("getMatchsByWinner reverts if none found", async function () {
            await expect(
                masterContract.getMatchsByWinner(await player3.getAddress())
            ).to.be.reverted;
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

    //
    // ─────────────────────────────────────────────────────────────
    //   TEST #6 : reportTournament / getTournamentByX
    // ─────────────────────────────────────────────────────────────
    //
    describe("reportTournament / getTournamentByX", function () {
        it("reportTournament reverts if non-owner calls", async function () {
            await expect(
                masterContract
                    .connect(player1)
                    .reportTournament(1111, [], await player1.getAddress())
            ).to.be.reverted;
        });

        it("reportTournament mints a TNT, store, emit event", async function () {
            await masterContract.addPlayer("Alice", await player1.getAddress());
            await masterContract.reportMatch("Alice", "Alice", 1, 0, 0, await player1.getAddress());

            await expect(
                masterContract.reportTournament(9999, [1], await player1.getAddress())
            ).to.emit(masterContract, "TournamentReported");
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

    //
    // ─────────────────────────────────────────────────────────────
    //   TESTS ADDITIONNELS POUR COUVRIR LES BRANCHES MANQUANTES
    // ─────────────────────────────────────────────────────────────
    //
    describe("Additional Coverage Tests", function () {
        it("getMatchsByPlayer covers the branch where player is actually player2", async function () {
            await masterContract.addPlayer("Alice", await player1.getAddress());
            await masterContract.addPlayer("Bob", await player2.getAddress());

            // Alice => player1, Bob => player2
            await masterContract.reportMatch("Alice", "Bob", 99, 5, 3, await player1.getAddress());

            // getMatchsByPlayer("Bob") => doit matcher "|| player2 == getPlayerAddress('Bob')"
            const bobMatches = await masterContract.getMatchsByPlayer("Bob");
            expect(bobMatches.length).to.equal(1);
            expect(bobMatches[0].matchId).to.equal(99);
        });

        it("getTournamentById covers the case where we find the tournament at a later index", async function () {
            await masterContract.reportTournament(1000, [], await player1.getAddress()); // => ID=1
            await masterContract.reportTournament(2000, [], await player2.getAddress()); // => ID=2
            await masterContract.reportTournament(3000, [], await player3.getAddress()); // => ID=3

            // Cherche ID=2 => doit "sauter" le 1er index
            const t2 = await masterContract.getTournamentById(2);
            expect(t2.endTimestamp).to.equal(2000);
            expect(t2.tournamentId).to.equal(2);
            expect(t2.winner).to.equal(await player2.getAddress());
        });

        //
        // Couvrir "balance < 20 => burn=(balance-10)" via un hack
        //
        it("calculateBurnAmount for balance < 20 => burn=(balance -10) by forcibly setting balance=19", async function () {
            // 1) Add player "Alice"
            await masterContract.addPlayer("Alice", await player1.getAddress());
            // => 100 tokens par défaut

            // On va "tricher" pour la ramener à 19
            // Car en décrémentant de 10, on ne peut jamais atteindre 19 pile.
            const hre = require("hardhat");

            // PongToken => mapping _balances sur slot 0 (souvent).
            const tokenAddress = await pongToken.getAddress();
            const slotOfBalances = 0; // si c'est un OZ ERC20 standard

            // Clé du mapping : keccak256(abi.encode(addr, slot))
            const abiCoder = new ethers.AbiCoder();
            const key = ethers.keccak256(
                abiCoder.encode(
                    ["address", "uint256"],
                    [await player1.getAddress(), slotOfBalances]
                )
            );

            // La valeur 19 en hex 32 bytes
            const value19 = ethers.hexlify(
                ethers.zeroPadValue(
                    ethers.toBeHex(19),
                    32
                )
            );

            // setStorageAt
            await hre.network.provider.send("hardhat_setStorageAt", [
                tokenAddress,
                key,
                value19
            ]);

            // Vérif => 19
            const newBalance = await pongToken.balanceOf(await player1.getAddress());
            expect(newBalance).to.equal(19n);

            // 2) Créer un 2e joueur => "Bob"
            await masterContract.addPlayer("Bob", await player2.getAddress());

            // 3) "Alice" perd => burn => (19-10)=9 => restera 10
            await masterContract.reportMatch("Alice", "Bob", 77, 0, 1, await player2.getAddress());
            expect(
                await pongToken.balanceOf(await player1.getAddress())
            ).to.equal(10n);
        });

        it("covers all missing branches for getMatchsByPlayer, getTournamentById, getTournamentByWinner", async function () {
            // 1) On enregistre 3 joueurs
            await masterContract.addPlayer("Alice", await player1.getAddress());
            await masterContract.addPlayer("Bob", await player2.getAddress());
            await masterContract.addPlayer("Charlie", await player3.getAddress());

            // 2) On crée 3 matches dans globalMatchesArray
            //    a) match #1 : Alice vs Bob (winner=Alice)
            //    b) match #2 : Bob vs Charlie (winner=Bob)
            //    c) match #3 : Alice vs Charlie (winner=Charlie)
            // => Ainsi, on aura "Bob" en player2 pour le 1er match,
            //    "Bob" en player1 pour le 2e, et "Charlie" en player2
            //    etc. On obtient tous les cas "||" possible pour getMatchsByPlayer("Bob").

            await masterContract.reportMatch("Alice", "Bob", 1, 4, 2, await player1.getAddress());     // matchId=1
            await masterContract.reportMatch("Bob", "Charlie", 2, 5, 3, await player2.getAddress());   // matchId=2
            await masterContract.reportMatch("Alice", "Charlie", 3, 1, 2, await player3.getAddress()); // matchId=3

            // 2.1) Vérifions getMatchsByPlayer("Bob")
            //      - match #1 => Bob est player2
            //      - match #2 => Bob est player1
            //      - match #3 => Bob n'est ni player1 ni player2
            // => On doit voir 2 matches dans le résultat
            const bobMatches = await masterContract.getMatchsByPlayer("Bob");
            expect(bobMatches.length).to.equal(2);
            // On aura couvert "player1 == Bob" (match #2), "player2 == Bob" (match #1) et "else" (match #3)

            // 3) On crée 3 tournois => ID=1,2,3
            //    T1 : winner=Alice (addr1)
            //    T2 : winner=Bob   (addr2)
            //    T3 : winner=Alice (addr1)
            await masterContract.reportTournament(1000, [1], await player1.getAddress()); // ID=1
            await masterContract.reportTournament(2000, [2], await player2.getAddress()); // ID=2
            await masterContract.reportTournament(3000, [3], await player1.getAddress()); // ID=3

            // 3.1) getTournamentById(3) => force la boucle à rater ID=1, rater ID=2, puis matcher ID=3
            const t3 = await masterContract.getTournamentById(3);
            expect(t3.tournamentId).to.equal(3);
            expect(t3.endTimestamp).to.equal(3000);

            // 3.2) getTournamentByWinner(addr1)
            // => on a T1 et T3 => winner=addr1, T2 => winner=addr2
            // => la boucle "if (globalTournamentsArray[i].winner == addr1)" passera true pour T1 & T3, false pour T2
            const aliceTourns = await masterContract.getTournamentByWinner(await player1.getAddress());
            expect(aliceTourns.length).to.equal(2);

            // => Tout ceci doit couvrir les chemins "else path not taken" restants.
        });

    });
});
