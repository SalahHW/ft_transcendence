// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./nfts/GoatNft.sol";
import "./nfts/TournamentNft.sol";
import "./tokens/PongToken.sol";

/**
 * @title MasterContract
 * @dev MasterContract to manage all the contracts and game logic
 */
contract MasterContract is Ownable {
    /**
     * @dev Variables to store contract references
     */
    GoatNft public goatNft;
    TournamentNft public tournamentNft;
    PongToken public pongToken;

    /**
     * @dev Struct to store player details
     * name: player name
     * exists: if the player is registered
     */
    struct Player {
        string name;
        bool exists;
    }

    /**
     * @dev Struct to store match details
     */
    struct Match {
        address player1;
        address player2;
        address winner;
        uint8 player1Score;
        uint8 player2Score;
        uint16 matchId;
    }

    /**
     * @dev Struct to store tournament details
     */
    struct Tournament {
        uint32 endTimestamp;
        uint16[] matchIds;
        uint16 tournamentId;
        address winner;
    }

    /**
     * @dev Arrays to store global matches and tournaments
     */
    Match[] public globalMatchesArray;
    Tournament[] public globalTournamentsArray;

    /**
     * @dev Mapping to store players by address
     */
    mapping(address => Player) public players;

    /**
     * @dev Events to track system activity
     */
    event MatchReported(
        address indexed player1,
        address indexed player2,
        address indexed winner,
        uint8 player1Score,
        uint8 player2Score,
        uint16 matchId
    );

    event TournamentReported(
        uint16 indexed tournamentId,
        uint32 endTimestamp,
        uint16[] matchIds,
        address indexed winner
    );

    event PlayerAdded(string name, address playerAddress);
    event PlayerRemoved(address playerAddress, string name);
    event GoatReassigned(address indexed newGoat);

    /**
     * @dev Constructor to initialize the contract
     */
    constructor(
        address _goatNft,
        address _pongToken,
        address _tournamentNft
    ) Ownable(msg.sender) {
        goatNft = GoatNft(_goatNft);
        pongToken = PongToken(_pongToken);
        tournamentNft = TournamentNft(_tournamentNft);
    }

    /**
     * @dev Function to add player
     * @param _name: player name
     * @param _player: player address
     */
    function addPlayer(string memory _name, address _player) public onlyOwner {
        require(!players[_player].exists, "Player already exists");
        players[_player] = Player({name: _name, exists: true});
        pongToken.mint(_player, 100);
        emit PlayerAdded(_name, _player);
    }

    /**
     * @dev Function to get player name
     * @param _player: player address
     * @return name of the player
     */
    function getPlayerName(
        address _player
    ) public view onlyOwner returns (string memory) {
        require(players[_player].exists, "Player does not exist");
        return players[_player].name;
    }

    /**
     * @dev Function to report match result
     */
    function reportMatch(
        address player1,
        address player2,
        uint16 matchId,
        uint8 player1Score,
        uint8 player2Score,
        address winner
    ) public onlyOwner {
        require(players[player1].exists, "Player1 not registered");
        require(players[player2].exists, "Player2 not registered");
        require(winner != address(0), "Winner address is invalid");

        for (uint i = 0; i < globalMatchesArray.length; i++) {
            if (globalMatchesArray[i].matchId == matchId) {
                revert("Match ID already used");
            }
        }

        pongToken.mint(winner, 10);

        if (
            pongToken.balanceOf(goatNft.getGoatAddress()) <
            pongToken.balanceOf(winner)
        ) {
            goatNft.transferNft(goatNft.getGoatAddress(), winner);
        }

        address loser = (player1 != winner) ? player1 : player2;
        uint256 burnAmount = calculateBurnAmount(pongToken.balanceOf(loser));
        pongToken.burn(loser, burnAmount);

        Match memory tempMatch = Match({
            player1: player1,
            player2: player2,
            winner: winner,
            player1Score: player1Score,
            player2Score: player2Score,
            matchId: matchId
        });

        globalMatchesArray.push(tempMatch);

        emit MatchReported(
            player1,
            player2,
            winner,
            player1Score,
            player2Score,
            matchId
        );
    }

    /**
     * @dev Function to get all matches played by a player
     */
    function getMatchesByPlayer(
        address player
    ) public view returns (Match[] memory) {
        require(players[player].exists, "Player does not exist");
        uint256 size = 0;
        for (uint i = 0; i < globalMatchesArray.length; i++) {
            if (
                globalMatchesArray[i].player1 == player ||
                globalMatchesArray[i].player2 == player
            ) {
                size++;
            }
        }
        if (size == 0) revert("No matches found for the player");

        Match[] memory result = new Match[](size);
        uint256 index = 0;
        for (uint i = 0; i < globalMatchesArray.length; i++) {
            if (
                globalMatchesArray[i].player1 == player ||
                globalMatchesArray[i].player2 == player
            ) {
                result[index++] = globalMatchesArray[i];
            }
        }
        return result;
    }

    /**
     * @dev Function to get all matches won by a player
     */
    function getMatchesByWinner(
        address winner
    ) public view returns (Match[] memory) {
        uint256 size = 0;
        for (uint i = 0; i < globalMatchesArray.length; i++) {
            if (globalMatchesArray[i].winner == winner) {
                size++;
            }
        }
        if (size == 0) revert("No matches found for the winner");

        Match[] memory result = new Match[](size);
        uint256 index = 0;
        for (uint i = 0; i < globalMatchesArray.length; i++) {
            if (globalMatchesArray[i].winner == winner) {
                result[index++] = globalMatchesArray[i];
            }
        }
        return result;
    }

    /**
     * @dev Function to get match by match ID
     */
    function getMatchesByMatchId(
        uint16 matchId
    ) public view returns (Match memory) {
        for (uint i = 0; i < globalMatchesArray.length; i++) {
            if (globalMatchesArray[i].matchId == matchId) {
                return globalMatchesArray[i];
            }
        }
        revert("Match not found");
    }

    /**
     * @dev Function to calculate amount of tokens to burn based on balance
     */
    function calculateBurnAmount(
        uint256 balance
    ) internal pure returns (uint256) {
        if (balance <= 10) return 0;
        if (balance < 20) return balance - 10;
        return 10;
    }

    /**
     * @dev Function to report a tournament and mint the tournament NFT
     */
    function reportTournament(
        uint32 endTimestamp,
        uint16[] memory matchIds,
        address winner,
        uint16 tournamentId
    ) public onlyOwner {
        require(
            matchIds.length == 4,
            "A tournament must include exactly 4 matches"
        );
        require(winner != address(0), "Winner address is invalid");

        for (uint i = 0; i < globalTournamentsArray.length; i++) {
            if (globalTournamentsArray[i].endTimestamp == endTimestamp) {
                revert("Tournament already exists");
            }
        }

        for (uint i = 0; i < matchIds.length; i++) {
            bool matchFound = false;
            for (uint j = 0; j < globalMatchesArray.length; j++) {
                if (globalMatchesArray[j].matchId == matchIds[i]) {
                    matchFound = true;
                    break;
                }
            }
            require(matchFound, "One or more matchIds do not exist");
        }

        tournamentNft.mintTnt(winner, tournamentId);

        Tournament memory t = Tournament({
            endTimestamp: endTimestamp,
            matchIds: matchIds,
            tournamentId: tournamentId,
            winner: winner
        });

        globalTournamentsArray.push(t);

        emit TournamentReported(tournamentId, endTimestamp, matchIds, winner);
    }

    /**
     * @dev Function to get tournament by ID
     */
    function getTournamentById(
        uint16 tournamentId
    ) public view returns (Tournament memory) {
        for (uint i = 0; i < globalTournamentsArray.length; i++) {
            if (globalTournamentsArray[i].tournamentId == tournamentId) {
                return globalTournamentsArray[i];
            }
        }
        revert("Tournament not found");
    }

    /**
     * @dev Function to get all tournaments won by a specific address
     */
    function getTournamentByWinner(
        address winner
    ) public view returns (Tournament[] memory) {
        uint256 size = 0;
        for (uint i = 0; i < globalTournamentsArray.length; i++) {
            if (globalTournamentsArray[i].winner == winner) {
                size++;
            }
        }
        if (size == 0) revert("No tournaments found for the winner");

        Tournament[] memory result = new Tournament[](size);
        uint256 index = 0;
        for (uint i = 0; i < globalTournamentsArray.length; i++) {
            if (globalTournamentsArray[i].winner == winner) {
                result[index++] = globalTournamentsArray[i];
            }
        }
        return result;
    }

    /**
     * @dev Function to remove a player
     * If the player owns the Goat NFT, it's transferred to owner,
     * then reassigned to the player with the highest PongToken balance
     * @param _player: player address to remove
     */
    function removePlayer(address _player) public onlyOwner {
        require(players[_player].exists, "Player does not exist");

        string memory name = players[_player].name;

        bool wasGoat = goatNft.getGoatAddress() == _player;
        if (wasGoat) {
            goatNft.transferNft(_player, owner());
        }

        delete players[_player];
        emit PlayerRemoved(_player, name);

        if (wasGoat) {
            address topPlayer = address(0);
            uint256 highestBalance = 0;

            for (uint i = 0; i < globalMatchesArray.length; i++) {
                address[2] memory candidates = [
                    globalMatchesArray[i].player1,
                    globalMatchesArray[i].player2
                ];

                for (uint j = 0; j < 2; j++) {
                    address candidate = candidates[j];
                    if (!players[candidate].exists) continue;

                    uint256 balance = pongToken.balanceOf(candidate);
                    if (balance > highestBalance) {
                        highestBalance = balance;
                        topPlayer = candidate;
                    }
                }
            }

            if (topPlayer != address(0)) {
                goatNft.transferNft(owner(), topPlayer);
                emit GoatReassigned(topPlayer);
            } else {
                emit GoatReassigned(address(0));
            }
        }
    }
}
