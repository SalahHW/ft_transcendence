// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GoatNft is ERC721, Ownable {
    address public goat;
    uint256 public balance;
    uint256 public tokenId = 299;

    event Transfert(address indexed from, address indexed to, uint256 amount);

    constructor(uint256 _newBalance) ERC721("GoatToken", "GOAT") {
        goat = msg.sender;
        balance = _newBalance;
        _mint(msg.sender, tokenId);
    }

    function updateGoat(
        address _newGoat,
        uint256 _newBalance
    ) external onlyOwner {
        transferNft(goat, _newGoat);
        goat = _newGoat;
        balance = _newBalance;
    }

    function transferNft(address _from, address _to) public onlyOwner {
        if (_from != msg.sender) {
            approve(_to, tokenId);
        }
        safeTransferFrom(_from, _to, tokenId);
        emit Transfert(_from, _to, tokenId);
        goat = _to;
    }

    function getGoatAddress() public returns (address) {
        return goat;
    }

    function getBalance() public returns (uint256) {
        return balance;
    }
}
