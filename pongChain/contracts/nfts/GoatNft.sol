// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title GoatNft
 * @dev Non-transferable except for the 'authorizedUpdater'.
 *      Used to track the current "GOAT" (highest balance).
 */
contract GoatNft is ERC721, Ownable {
    uint256 public goatBalance;
    uint256 public constant TOKEN_ID = 1;
    address public authorizedUpdater;

    event GoatUpdated(
        address indexed previousGoat,
        address indexed newGoat,
        uint256 newBalance
    );

    constructor(
        address initialGoat,
        uint256 initialBalance
    ) ERC721("GOAT NFT", "GOAT") Ownable(msg.sender) {
        _mint(initialGoat, TOKEN_ID);
        goatBalance = initialBalance;
        _transferOwnership(initialGoat);
    }

    function setAuthorizedUpdater(address _updater) external onlyOwner {
        authorizedUpdater = _updater;
    }

    function updateGoat(address newGoat, uint256 newBalance) external {
        require(
            msg.sender == authorizedUpdater,
            "GoatNft: caller not authorized"
        );

        address currentGoat = ownerOf(TOKEN_ID);
        if (newGoat != currentGoat) {
            _transfer(currentGoat, newGoat, TOKEN_ID);
        }

        goatBalance = newBalance;
        emit GoatUpdated(currentGoat, newGoat, newBalance);
    }

    function getGoatBalance(
        address pongTokenAddress
    ) external view returns (uint256) {
        return IERC20(pongTokenAddress).balanceOf(ownerOf(TOKEN_ID));
    }

    function _isAuthorized(
        address /*owner*/,
        address spender,
        uint256 /*tokenId*/
    ) internal view virtual override returns (bool) {
        return (spender == authorizedUpdater);
    }
}
