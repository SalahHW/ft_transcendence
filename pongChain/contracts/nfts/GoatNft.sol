// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract GoatNft is ERC721, ERC721URIStorage, Ownable {
    address public goat;
    uint256 public tokenId = 299;

    event Transfert(address indexed from, address indexed to, uint256 amount);

    constructor() ERC721("GoatToken", "GOAT") {
        goat = msg.sender;
        _mint(msg.sender, tokenId);
		_setTokenURI(tokenId, "ipfs://bafkreigyctqe5fb456qcfydg6pfy6zdh626eid4f5znwf6yj6rnjlzbq5a/GoatNFT.json");
    }

	function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
    	return super.tokenURI(tokenId);
	}

    function updateGoat(
        address _newGoat
    ) external onlyOwner {
        transferNft(goat, _newGoat);
        goat = _newGoat;
    }

    function transferNft(address _from, address _to) public onlyOwner {
        safeTransferFrom(_from, _to, tokenId);
        emit Transfert(_from, _to, tokenId);
        goat = _to;
    }

    function getGoatAddress() public view returns (address) {
        return goat;
    }

    function _checkAuthorized(
        address owner,
        address spender,
        uint256 tokenId
    ) internal view override {
        if (spender != owner()) {
            revert("Only admin can transfer tokens");
        }
    }
}
