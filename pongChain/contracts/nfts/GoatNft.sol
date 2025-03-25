// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @title GoatNft
 * GoatNft - a contract for my non-fungible goats.
 */

contract GoatNft is ERC721, ERC721URIStorage, Ownable {
    /**
     * @dev goat: address of the goat
     * @dev goatTokenId: id of the goat token
     */

    address public goat;
    uint256 public goatTokenId = 299;

    /**
     * @dev Transfert event
     * @param from: address of the sender
     * @param to: address of the receiver
     * @param amount: amount of the token
     */

    event Transfert(address indexed from, address indexed to, uint256 amount);

    /**
     * @dev Constructor to mint a goat token and set the token URI
     */

    constructor() ERC721("GoatToken", "GOAT") Ownable(msg.sender) {
        goat = msg.sender;
        _mint(msg.sender, goatTokenId);
        _setTokenURI(
            goatTokenId,
            "ipfs://bafkreigyctqe5fb456qcfydg6pfy6zdh626eid4f5znwf6yj6rnjlzbq5a/GoatNFT.json"
        );
    }

    /**
     * @dev transferNft function to transfer the goat token to a new address
     * @param _from: address of the sender
     * @param _to: address of the receiver
     */

    function transferNft(address _from, address _to) public onlyOwner {
        safeTransferFrom(_from, _to, goatTokenId);
        emit Transfert(_from, _to, goatTokenId);
        goat = _to;
    }

    /**
     * @dev getGoatAddress function to get the address of the goat
     * @return address of the goat
     */

    function getGoatAddress() public view returns (address) {
        return goat;
    }

    /**
     * @dev override _checkAuthorized function to check if the sender is the owner
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
     * @dev override supportsInterface and tokenURI functions
     * @param interfaceId: id of the interface
     * @return boolean
     */

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev override tokenURI function
     * @param tokenId: id of the token
     * @return string
     */

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
}
