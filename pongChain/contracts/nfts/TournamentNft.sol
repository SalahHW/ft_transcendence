// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TournamentNft
 * TournamentNft - a contract for my non-fungible tournament tokens.
 */

contract TournamentNft is ERC721, Ownable {
    /**
     * @dev tntTracking: mapping of tournamentId to winner address
     */

    mapping(uint256 => address) tntTracking;

    /**
     * @dev Constructor to mint a tournament token
     */

    constructor() ERC721("TournamentToken", "TNT") Ownable(msg.sender) {}

    /**
     * @dev mintTnt function to mint a tournament token to a new address
     * @param winner: address of the winner
     * @param tournamentId: id of the tournament token
     */

    function mintTnt(address winner, uint256 tournamentId) public onlyOwner {
        _mint(winner, tournamentId);
        tntTracking[tournamentId] = winner;
    }

    /**
     * @dev _checkAuthorized function to check if the sender is the owner
     * @param spender: address of the spender
     */

    function _checkAuthorized(
        address /*owner*/,
        address spender,
        uint256 /*tokenId*/
    ) internal view override {
        if (spender != Ownable.owner()) {
            revert("Only admin can transfer tokens");
        }
    }

    /**
     * @dev getTracking function to get the winner address of the tournament
     * @param tokenId: id of the tournament token
     * @return address of the winner
     */

    function getTracking(uint256 tokenId) public view returns (address) {
        return tntTracking[tokenId];
    }
}
