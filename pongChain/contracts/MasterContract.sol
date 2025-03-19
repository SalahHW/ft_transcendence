// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./managers/MatchManager.sol";
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

    MatchManager public matchManager;
    GoatNft public goatNft;
    TournamentNft public tournamentNft;
    PongToken public pongToken;

    /**
     * @dev Struct to store match data
     * player1: player1 name
     * player2: player2 name
     * winner: winner address
     * timestamp: timestamp of the match
     */

    struct Match {
        string player1;
        string player2;
        address winner;
        uint256 timestamp;
    }

    /**
     * @dev Struct to store tournament data
     * tournamentId: tournament id
     * endTimestamp: end timestamp of the tournament
     * matchIds: array of match ids
     * winner: winner address
     */

    struct Tournament {
        uint256 tournamentId;
        uint256 endTimestamp;
        uint256[] matchIds;
        address winner;
    }

    /**
     * @dev Mapping to store player name to address
     * string: player name to address mapping
     * address: player address
     */

    mapping(string => address) private players;

    /**
     * @dev Mapping to store matchId to match data
     * uint256: matchId
     * Match: match struct
     * No getter needed since it is public
     */

    mapping(uint256 => Match) public matches;

    /**
     * @dev Mapping to store tournamentId to tournament data
     * uint256: tournamentId
     * uint256: tournament data
     * No getter needed since it is public
     */

    mapping(uint256 => Tournament) public tournaments;

    /**
     * @dev tournamentTokenIds to store tournament token ids
     */

    uint256 public tournamentTokenIds;

    /**
     * @dev Constructor to initialize the contract
     * @param _goatNft: address of GoatNft contract
     * @param _matchManager: address of MatchManager contract
     * @param _pongToken: address of PongToken contract
     * @param _tournamentNft: address of TournamentNft contract
     */

    constructor(
        address _goatNft,
        address _matchManager,
        address _pongToken,
        address _tournamentNft
    ) Ownable(msg.sender) {
        goatNft = GoatNft(_goatNft);
        matchManager = MatchManager(_matchManager);
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
        players[_name] = _player;
        mintTokens(_player, 100);
    }

    /**
     * @dev Function to get player address
     * @param _name: player name
     * @return player address
     */

    function getPlayerAddress(
        string _name
    ) public view onlyOwner returns (address) {
        return players[_name];
    }

    /**
     * @dev Function to mint tokens
     * @param _to: address to mint tokens
     * @param _amount: amount of tokens to mint
     */

    function mintTokens(address _to, uint256 _amount) public onlyOwner {
        pongToken.mint(_to, _amount);
    }

    /**
     * @dev Function to report match
     * @param matchId: match id
     * @param player1: player1 name
     * @param player2: player2 name
     * @param winner: winner address
     */

    function reportMatch(
        uint256 matchId,
        string player1,
        string player2,
        address winner
    ) public onlyOwner {
        matches[matchId] = matchManager.reportMatchResult1v1(
            player1,
            player2,
            winner
        );
        if (goatNft.getNftBalance() < pongToken.balanceOf(winner)) {
            updateGoatNft(winner);
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
        uint256[] matchIds,
        address winner
    ) public onlyOwner {
        tournaments[tournamentTokenIds] = tournamentManager
            .reportTournamentResult(
                tournamentTokenIds,
                endTimestamp,
                matchIds,
                winner
            );
        mintTournamentNft(winner, tournamentId);
    }
}
