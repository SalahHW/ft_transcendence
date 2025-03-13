// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./managers/MatchManager.sol";
import "./nfts/GoatNft.sol";

/**
 * @title MasterContract
 * @dev Main controller for the MatchManager and GoatNft.
 */
contract MasterContract is Ownable {
    GoatNft public goatNft;
    MatchManager public matchManager;

    constructor(address _goatNft) Ownable(msg.sender) {
        goatNft = GoatNft(_goatNft);
    }

    function setMatchManager(address _matchManager) external onlyOwner {
        matchManager = MatchManager(_matchManager);
    }

function getGoatBalance(address pongTokenAddress) external view returns (uint256) {
    return goatNft.getGoatBalance(pongTokenAddress);
}

    function updateGoat(address newGoat, uint256 newBalance) external {
        require(msg.sender == address(matchManager), "MasterContract: Only MatchManager can call this");
        goatNft.updateGoat(newGoat, newBalance);
    }
}
