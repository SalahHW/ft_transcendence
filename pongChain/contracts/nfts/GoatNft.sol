// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract GoatNft is ERC721, ERC721URIStorage, Ownable {
    address public goat;
    uint256 public goatTokenId = 299;

    event Transfert(address indexed from, address indexed to, uint256 amount);

    constructor() ERC721("GoatToken", "GOAT") Ownable(msg.sender) {
        goat = msg.sender;
        _mint(msg.sender, goatTokenId);
        _setTokenURI(
            goatTokenId,
            "ipfs://bafkreidxqrthlwphtx4lmxyzg7spjv4m3qrymxradrn3446gz6u727mtfy/goat.png"
        );
    }

    function updateGoat(address _newGoat) external onlyOwner {
        transferNft(goat, _newGoat);
        goat = _newGoat;
    }

    function transferNft(address _from, address _to) public onlyOwner {
        safeTransferFrom(_from, _to, goatTokenId);
        emit Transfert(_from, _to, goatTokenId);
        goat = _to;
    }

    function getGoatAddress() public view returns (address) {
        return goat;
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
}
