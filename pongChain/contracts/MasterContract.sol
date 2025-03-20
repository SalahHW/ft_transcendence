//SPDX-License-Identifier: MIT

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
        uint16 indexed matchId
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

    uint256 public tournamentTokenIds;

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
        goatNft.mintNft;
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
     * @param winner: winner address
     */

    // SINTERESSE PARAM CASH OBJET MATCH CAR PROVIENDRAIT DUN JSON

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
        require(matches[matchId] == address(0), "Match ID already exists");
        if (goatNft.getNftBalance() < pongToken.balanceOf(winner)) {
            updateGoatNft(winner);
        }
        pongToken.mint(winner, 10);
        address loser = (getPlayerAddress(player1) != winner)
            ? getPlayerAddress(player1)
            : getPlayerAddress(player2);
        uint256 amountToBurn = calculateBurnAmount(pongToken.balanceOf(loser));
        pongToken._burn(loser, amountToBurn);
        Match tempMatchStruct = fillMatchStruct(
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
            matchId,
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
    ) internal returns (Match) {
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
    ) public view returns (globalMatchesArray) {
        Match[] memory playerMatches;
        for (uint i = 0; i < globalMatchesArray.length; i++) {
            if (
                globalMatchesArray[i].player1 == getPlayerAddress(player) ||
                globalMatchesArray[i].player2 == getPlayerAddress(player)
            ) {
                playerMatches.push(globalMatchesArray[i]);
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
    ) public view returns (globalMatchesArray) {
        Match[] memory playerMatches;
        for (uint i = 0; i < globalMatchesArray.length; i++) {
            if (globalMatchesArray[i].winner == winner) {
                playerMatches.push(globalMatchesArray[i]);
            }
        }
        return playerMatches;
    }

    /**
     * @dev Function to get match by match id
     * @param matchId: match id
     * @return match details
     */

    function getMatchsByMatchId(uint16 matchId) public view returns (Match) {
        for (uint i = 0; i < globalMatchesArray.length; i++) {
            if (globalMatchesArray[i].matchId == matchId) {
                return globalMatchesArray[i];
            }
        }
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
     * @dev Function to mint tournament nft
     * @param _to: address to mint nft
     * @param tournamentId: tournament id
     */

    function mintTournamentNft(
        string _to,
        uint256 tournamentId
    ) public onlyOwner {
        tournamentNft.mint(
            getPlayerAddress(_to),
            tournamentTokenIds,
            tournamentId
        );
        tournamentTokenIds++;
    }

    /**
     * @dev Function to get amont of Pong the Goat owns
     * @return amount of Pong the Goat owns
     */

    function getGoatBalance() public view returns (uint256) {
        return goatNft.getNftBalance();
    }

    /**
     * @dev Function to update Goat NFT
     * @param winner: winner address
     */

    function updateGoatNft(address winner) internal onlyOwner {
        goatNft.updateGoatNft(winner);
    }

    /**
     * @dev Function to report tournament
     * @param endTimestamp: end timestamp of the tournament
     * @param matchIds: array of match ids (match have to be already
     * reported and this function called once all the matches are ended)
     * @param winner: winner address
     */

    function reportTournament(
        uint256 endTimestamp,
        uint256[] memory matchIds,
        address winner
    ) public onlyOwner {
        mintTournamentNft(winner, tournamentTokenIds);
        Tournament tempTournament = fillTournamentStruct(
            endTimestamp,
            matchIds,
            tournamentId,
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
    ) internal returns (Tournament) {
        Tournament memory tempTournament = Tournament({
            endTimestamp: endTimestamp,
            matchIds: matchIds,
            tournamentId: tournamentId,
            winner: winner
        });
        return tempTournament;
    }
}
