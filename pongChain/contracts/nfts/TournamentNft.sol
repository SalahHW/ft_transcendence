// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TournamentNft
 * @dev ERC721 token representing a tournament trophy, non-transferable.
 */
contract TournamentNft is ERC721, Ownable {
    event TournamentNftMinted(
        address indexed winner,
        uint256 tokenId,
        uint256 tournamentId
    );

    constructor() ERC721("Tournament Trophy", "TNT") Ownable(msg.sender) {}

    function mintTournamentNft(
        address winner,
        uint256 tournamentId,
        uint256 tokenId
    ) external onlyOwner {
        _mint(winner, tokenId);

        emit TournamentNftMinted(winner, tokenId, tournamentId);
    }

    /**
     * @dev Override to prevent any transfer
     */
    function _isAuthorized(
        address /*owner*/,
        address /*spender*/,
        uint256 /*tokenId*/
    ) internal view virtual override returns (bool) {
        return (false);
    }
}
