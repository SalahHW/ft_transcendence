// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TournamentNft is ERC721, Ownable {
    mapping(uint256 => address) tntTracking;

    constructor() ERC721("TournamentToken", "TNT") Ownable(msg.sender) {}

    function mintTnt(address winner, uint256 tournamentId) public onlyOwner {
        _mint(winner, tournamentId);
        tntTracking[tournamentId] = winner;
    }

    function _checkAuthorized(
        address /*owner*/,
        address spender,
        uint256 /*tokenId*/
    ) internal view override {
        if (spender != Ownable.owner()) {
            revert("Only admin can transfer tokens");
        }
    }

    function getTracking(uint256 tokenId) public view returns (address) {
        return tntTracking[tokenId];
    }
}
