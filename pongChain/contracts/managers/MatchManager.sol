// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../tokens/PongToken.sol";
import "../MasterContract.sol";

/**
 * @title MatchManager
 * @dev Manages 1v1 match results, staking, awarding, and GOAT update.
 */
contract MatchManager is Ownable {
    PongToken public pongToken;
    MasterContract public masterContract;

    uint256 public constant STAKE = 10e18;

    struct Match {
        uint256 matchId;
        address player1;
        address player2;
        address winner;
        uint256 timestamp;
    }

    mapping(uint256 => Match) public matches;

    event MatchReported(
        uint256 indexed matchId,
        address indexed player1,
        address indexed player2,
        address winner,
        uint256 potAmount,
        uint256 timestamp
    );

    constructor(address _pongToken, address _masterContract) Ownable(msg.sender) {
        pongToken = PongToken(_pongToken);
        masterContract = MasterContract(_masterContract);
    }

    function reportMatchResult1v1(
        uint256 matchId,
        address player1,
        address player2,
        address winner
    ) external onlyOwner {
        require(winner == player1 || winner == player2, "Invalid winner");
        require(matches[matchId].timestamp == 0, "Match already reported");

        require(pongToken.allowance(player1, address(this)) >= STAKE, "player1 allowance insufficient");
        require(pongToken.allowance(player2, address(this)) >= STAKE, "player2 allowance insufficient");

        require(pongToken.transferFrom(player1, address(this), STAKE), "Stake from player1 failed");
        require(pongToken.transferFrom(player2, address(this), STAKE), "Stake from player2 failed");

        require(pongToken.transfer(winner, 2 * STAKE), "Pot transfer failed");

        matches[matchId] = Match({
            matchId: matchId,
            player1: player1,
            player2: player2,
            winner: winner,
            timestamp: block.timestamp
        });

        emit MatchReported(matchId, player1, player2, winner, 2 * STAKE, block.timestamp);

        uint256 winnerBalance = pongToken.balanceOf(winner);
        uint256 currentGoatBalance = masterContract.getGoatBalance(address(pongToken));
        if (winnerBalance > currentGoatBalance) {
            masterContract.updateGoat(winner, winnerBalance);
}
    }
}
