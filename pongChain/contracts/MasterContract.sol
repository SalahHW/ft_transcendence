// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./managers/MatchManager.sol";
import "./nfts/GoatNft.sol";
import "./nfts/TournamentNft.sol";
import "./tokens/PongToken.sol";

/**
 * @title MasterContract
 * @dev Main controller for the MatchManager and GoatNft.
 */
contract MasterContract is Ownable {
    GoatNft public goatNft;
    MatchManager public matchManager;
    PongToken public pongToken;
    TournamentNft public tournamentNft;

    struct Match {
        address player1;
        address player2;
        address winner;
        uint256 timestamp;
    }

    uint256 public tournamentTokenId;

    mapping(string => address) public players;
    mapping(uint256 => Match) public matches;
    mapping(uint256 => uint256) public tournamentIds;

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
        tournamentTokenId = 1;
    }

    function addPlayer(string memory name, address player) external onlyOwner {
        players[name] = player;
        givePlayerTokens(name, 100);
    }

    function givePlayerTokens(
        string memory name,
        uint256 amount
    ) private onlyOwner {
        pongToken.mint(players[name], amount);
    }

    function tokensFromLoserToWinner(
        address player1,
        address player2,
        address winner
    ) internal onlyOwner {
        require(
            msg.sender == address(matchManager),
            "MasterContract: Only MatchManager can call this"
        );
        if (winner == player1) {
            pongToken.transferFrom(player2, player1, 10);
        } else {
            pongToken.transferFrom(player1, player2, 10);
        }
    }

    function getPlayerAddress(
        string memory name
    ) public view onlyOwner returns (address) {
        return players[name];
    }

    function getGoatBalance(
        address pongTokenAddress
    ) external view onlyOwner returns (uint256) {
        return goatNft.getGoatBalance(pongTokenAddress);
    }

    function updateGoat(
        address newGoat,
        uint256 newBalance
    ) external onlyOwner {
        require(
            msg.sender == address(matchManager),
            "MasterContract: Only MatchManager can call this"
        );
        goatNft.updateGoat(newGoat, newBalance);
    }

    function mintTournamentNft(
        address winner,
        uint256 tournamentId
    ) external onlyOwner {
        tournamentNft.mintTournamentNft(
            winner,
            tournamentId,
            tournamentTokenId
        );
        tournamentIds[tournamentTokenId] = tournamentId;
        tournamentTokenId++;
    }

    function storeMatch(
        MatchManager.Match memory newMatch,
        uint256 matchId
    ) private onlyOwner {
        matches[matchId].player1 = newMatch.player1;
        matches[matchId].player2 = newMatch.player2;
        matches[matchId].winner = newMatch.winner;
        matches[matchId].timestamp = newMatch.timestamp;
    }

    function reportMatchResult(
        uint256 matchId,
        string memory player1,
        string memory player2,
        address winner
    ) external onlyOwner {
        require(
            msg.sender == address(matchManager),
            "MasterContract: Only MatchManager can call this"
        );
        MatchManager.Match memory tempMatch = matchManager.reportMatchResult1v1(
            getPlayerAddress(player1),
            getPlayerAddress(player2),
            winner
        );

        storeMatch(tempMatch, matchId);

        tokensFromLoserToWinner(
            getPlayerAddress(player1),
            getPlayerAddress(player2),
            winner
        );
    }
}
