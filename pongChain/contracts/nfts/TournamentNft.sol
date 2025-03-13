// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TournamentNft
 * @dev ERC721 token representing a tournament trophy, non-transferable.
 */
contract TournamentNft is ERC721, Ownable {
    uint256 public nextTokenId;
    mapping(uint256 => uint256) public tournamentIds;

    event TournamentNftMinted(
        address indexed winner,
        uint256 tokenId,
        uint256 tournamentId
    );

    constructor() ERC721("Tournament Trophy", "TNT") Ownable(msg.sender) {
        nextTokenId = 1;
    }

    function mintTournamentNft(
        address winner,
        uint256 tournamentId
    ) external onlyOwner {
        uint256 tokenId = nextTokenId++;
        _mint(winner, tokenId);
        tournamentIds[tokenId] = tournamentId;

        emit TournamentNftMinted(winner, tokenId, tournamentId);
    }

    /**
     * @dev Override to prevent any transfer
     */
    function _isAuthorized(
        address owner,
        address spender, 
        uint256 tokenId
    ) internal view virtual override returns (bool) {
            return (false);
    }
}
