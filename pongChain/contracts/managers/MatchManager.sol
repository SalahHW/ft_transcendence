// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../MasterContract.sol";

/**
 * @title MatchManager
 * @dev Manages 1v1 match results, staking, awarding, and GOAT update.
 */
contract MatchManager is Ownable {
    uint256 public constant STAKE = 10e18;

    event MatchReported(
        address indexed player1,
        address indexed player2,
        address winner,
        uint256 timestamp
    );

    struct Match {
        address player1;
        address player2;
        address winner;
        uint256 timestamp;
    }

    constructor() Ownable(msg.sender) {}

    function reportMatchResult1v1(
        address player1,
        address player2,
        address winner
    ) external onlyOwner returns (Match memory) {
        require(winner == player1 || winner == player2, "Invalid winner");

        Match memory newMatch = Match({
            player1: player1,
            player2: player2,
            winner: winner,
            timestamp: block.timestamp
        });

        emit MatchReported(player1, player2, winner, block.timestamp);

        return newMatch;
    }
}
