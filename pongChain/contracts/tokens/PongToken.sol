//SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PongToken
 * @dev ERC20 token contract
 */

contract PongToken is ERC20, Ownable {
    /**
     * @dev Constructor to mint initial supply
     * name: PongToken
     * symbol: PONG
     */

    constructor() ERC20("PongToken", "PONG") Ownable(msg.sender) {}

    /**
     * @dev Function to mint tokens
     * @param to: address to mint tokens
     * @param amount: amount to mint
     */

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Function to burn tokens
     * @param from: address to burn tokens
     * @param amount: amount to burn
     */

    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }
}
