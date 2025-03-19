// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin./contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PongToken is ERC20, ERC20Burnable, Ownable {
    /**
     * @dev Constructor to mint initial supply
     * @param: name of the token
     * @param: symbol of the token
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
     * @param amount: amount to burn
     * @param address: address to burn tokens
     */

    function burn(uint256 amount, address _from) public onlyOwner {
        _burn(_from, amount);
    }
}
