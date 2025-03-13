//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title PongToken
 * @dev PongToken is a ERC20 token that:
    *  - Mintable
    *  - Burnable
    *  - Has no max supply
 */

 contract PongToken is ERC20, ERC20Burnable, Ownable {
    address public minter;

    constructor() ERC20("PongToken", "PONG") Ownable(msg.sender) {
        minter = msg.sender;
    }

    /**
     * @dev Mint amount tokens to address
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "PongToken: only the minter can mint");
        _mint(to, amount);
    }
 }

