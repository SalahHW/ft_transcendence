// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./nfts/GoatNft.sol";
import "./nfts/TournamentNft.sol";
import "./tokens/PongToken.sol";

/**
 * @title MasterContract
 * @dev MasterContract to manage all the contracts
 */

contract MasterContract is Ownable {
    /**
     * @dev Variables to store contract addresses
     */

    GoatNft public goatNft;
    TournamentNft public tournamentNft;
    PongToken public pongToken;

    /**
     * @dev Struct to store match details
     * player1: player1 address
     * player2: player2 address
     * winner: winner address
     * player1Score: player1 score
     * player2Score: player2 score
     * matchId: match id
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
     * endTimestamp: end timestamp of the tournament
     * matchIds: array of match ids
     * winner: winner address
     * tournamentId: tournament id
     */

    struct Tournament {
        uint32 endTimestamp;
        uint16[] matchIds;
        uint16 tournamentId;
        address winner;
    }

    /**
     * @dev Array to store all matches
     * uint16: match id
     * Match: match details
     */

    Match[] public globalMatchesArray;

    /**
     * @dev Array to store all tournaments
     * uint256: tournament id
     * Tournament: tournament details
     */

    Tournament[] public globalTournamentsArray;

    /**
     * @dev Mapping to store player
     * string: player name to address mapping
     * address: player address
     */

    mapping(string => address) private players;

    /**
     * @dev Event to log match reported
     * @param player1: player1 name
     * @param player2: player2 name
     * @param winner: winner address
     * @param player1Score: player1 score
     * @param player2Score: player2 score
     * @param matchId: match id
     */

    event MatchReported(
        address indexed player1,
        address indexed player2,
        address indexed winner,
        uint8 player1Score,
        uint8 player2Score,
        uint16 matchId
    );

    /**
     * @dev Event to log tournament reported
     * @param tournamentId: tournament id
     * @param winner: winner address
     */

    event TournamentReported(
        uint16 indexed tournamentId,
        uint32 endTimestamp,
        uint16[] matchIds,
        address indexed winner
    );

    /**
     * @dev Event to log player added
     * @param name: player name
     * @param playerAddress: player address
     */

    event PlayerAdded(string name, address playerAddress);

    /**
     * @dev tournamentTokenIds to store tournament token ids
     */

    uint16 public tournamentTokenIds;

    /**
     * @dev Constructor to initialize the contract
     * @param _goatNft: address of GoatNft contract
     * @param _pongToken: address of PongToken contract
     * @param _tournamentNft: address of TournamentNft contract
     */

    constructor(
        address _goatNft,
        address _pongToken,
        address _tournamentNft
    ) Ownable(msg.sender) {
        goatNft = GoatNft(_goatNft);
        pongToken = PongToken(_pongToken);
        tournamentNft = TournamentNft(_tournamentNft);
        tournamentTokenIds = 1;
    }

    /**
     * @dev Function to add player
     * @param _name: player name
     * @param _player: player address
     */

    function addPlayer(string memory _name, address _player) public onlyOwner {
        require(players[_name] == address(0), "Player already exists");
        players[_name] = _player;
        pongToken.mint(_player, 100);
        emit PlayerAdded(_name, _player);
    }

    /**
     * @dev Function to get player address
     * @param _name: player name
     * @return player address
     */

    function getPlayerAddress(
        string memory _name
    ) public view onlyOwner returns (address) {
        return players[_name];
    }

    /**
     * @dev Function to report match
     * @param matchId: match id
     * @param player1: player1 name
     * @param player2: player2 name
     * @param player1Score: player1 score
     * @param player2Score: player2 score
     * @param winner: winner address
     */

    function reportMatch(
        string memory player1,
        string memory player2,
        uint16 matchId,
        uint8 player1Score,
        uint8 player2Score,
        address winner
    ) public onlyOwner {
        require(
            getPlayerAddress(player1) != address(0),
            "Player1 not registered"
        );
        require(
            getPlayerAddress(player2) != address(0),
            "Player2 not registered"
        );
        require(winner != address(0), "Winner address is invalid");
        pongToken.mint(winner, 10);
        if (
            pongToken.balanceOf(goatNft.getGoatAddress()) <
            pongToken.balanceOf(winner)
        ) {
            goatNft.transferNft(goatNft.getGoatAddress(), winner);
        }
        address loser = (getPlayerAddress(player1) != winner)
            ? getPlayerAddress(player1)
            : getPlayerAddress(player2);
        uint256 amountToBurn = calculateBurnAmount(pongToken.balanceOf(loser));
        pongToken.burn(loser, amountToBurn);
        Match memory tempMatch = fillMatchStruct(
            player1,
            player2,
            winner,
            player1Score,
            player2Score,
            matchId
        );
        globalMatchesArray.push(tempMatch);
        emit MatchReported(
            getPlayerAddress(player1),
            getPlayerAddress(player2),
            winner,
            player1Score,
            player2Score,
            matchId
        );
    }

    /**
     * @dev Function to fill match struct
     * @param player1: player1 name
     * @param player2: player2 name
     * @param winner: winner address
     * @param player1Score: player1 score
     * @param player2Score: player2 score
     * @param matchId: match id
     * @return Match struct
     */

    function fillMatchStruct(
        string memory player1,
        string memory player2,
        address winner,
        uint8 player1Score,
        uint8 player2Score,
        uint16 matchId
    ) internal returns (Match memory) {
        Match memory tempMatch = Match({
            player1: getPlayerAddress(player1),
            player2: getPlayerAddress(player2),
            winner: winner,
            player1Score: player1Score,
            player2Score: player2Score,
            matchId: matchId
        });
        return tempMatch;
    }

    /**
     * @dev Function to get all matches played by a player
     * @param player: player name
     * @return array of matches played by the player
     */

    function getMatchsByPlayer(
        string memory player
    ) public view returns (Match[] memory) {
        uint256 size = 0;
        for (uint i = 0; i < globalMatchesArray.length; i++) {
            if (
                globalMatchesArray[i].player1 == getPlayerAddress(player) ||
                globalMatchesArray[i].player2 == getPlayerAddress(player)
            ) {
                size++;
            }
        }
        if (size == 0) {
            revert("No matches found for the player");
        }
        Match[] memory playerMatches = new Match[](size);
        uint256 index = 0;
        for (uint i = 0; i < globalMatchesArray.length; i++) {
            if (
                globalMatchesArray[i].player1 == getPlayerAddress(player) ||
                globalMatchesArray[i].player2 == getPlayerAddress(player)
            ) {
                playerMatches[index] = globalMatchesArray[i];
                index++;
            }
        }
        return playerMatches;
    }

    /**
     * @dev Function to get all matches won by a player
     * @param winner: winner address
     * @return array of matches won by the player
     */

    function getMatchsByWinner(
        address winner
    ) public view returns (Match[] memory) {
        uint256 size = 0;
        for (uint i = 0; i < globalMatchesArray.length; i++) {
            if (globalMatchesArray[i].winner == winner) {
                size++;
            }
        }
        if (size == 0) {
            revert("No matches found for the winner");
        }
        Match[] memory playerMatches = new Match[](size);
        uint256 index = 0;
        for (uint i = 0; i < globalMatchesArray.length; i++) {
            if (globalMatchesArray[i].winner == winner) {
                playerMatches[index] = globalMatchesArray[i];
                index++;
            }
        }
        return playerMatches;
    }

    /**
     * @dev Function to get match by match id
     * @param matchId: match id
     * @return match details
     */

    function getMatchsByMatchId(
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
     * @dev Function to calculate amount to burn
     * @param balance: balance of the player
     * @return amount to burn
     */

    function calculateBurnAmount(
        uint256 balance
    ) internal onlyOwner returns (uint256) {
        if (balance <= 10) {
            return 0;
        } else if (balance < 20) {
            return balance - 10;
        } else {
            return 10;
        }
    }

    /**
     * @dev Function to report tournament
     * @param endTimestamp: end timestamp of the tournament
     * @param matchIds: array of match ids (match have to be already
     * reported and this function called once all the matches are ended)
     * @param winner: winner address
     */

    function reportTournament(
        uint32 endTimestamp,
        uint16[] memory matchIds,
        address winner
    ) public onlyOwner {
        tournamentNft.mintTnt(winner, tournamentTokenIds);
        Tournament memory tempTournament = fillTournamentStruct(
            endTimestamp,
            matchIds,
            tournamentTokenIds,
            winner
        );
        globalTournamentsArray.push(tempTournament);
        emit TournamentReported(
            tournamentTokenIds,
            endTimestamp,
            matchIds,
            winner
        );
        tournamentTokenIds++;
    }

    /**
     * @dev Function to fill tournament struct
     * @param endTimestamp: end timestamp of the tournament
     * @param matchIds: array of match ids
     * @param winner: winner address
     * @param tournamentId: tournament id
     * @return Tournament struct
     */

    function fillTournamentStruct(
        uint32 endTimestamp,
        uint16[] memory matchIds,
        uint16 tournamentId,
        address winner
    ) internal returns (Tournament memory) {
        Tournament memory tempTournament = Tournament({
            endTimestamp: endTimestamp,
            matchIds: matchIds,
            tournamentId: tournamentId,
            winner: winner
        });
        return tempTournament;
    }

    /**
     * @dev Function to get tournament by id
     * @param tournamentId: tournament id
     * @return array of tournaments
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
     * @dev Function to get tournament by winner
     * @param winner: winner address
     * @return array of tournaments
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
        if (size == 0) {
            revert("No tournaments found for the winner");
        }
        Tournament[] memory playerTournaments = new Tournament[](size);
        uint256 index = 0;
        for (uint i = 0; i < globalTournamentsArray.length; i++) {
            if (globalTournamentsArray[i].winner == winner) {
                playerTournaments[index] = globalTournamentsArray[i];
                index++;
            }
        }
        return playerTournaments;
    }
}
