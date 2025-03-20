// SPDX-Licence-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GoatNFT is ERC721, Ownable {

	string public initialGoat;
	address public goat;
	uint256 public newBalance;
	uint256 public GoatNFT_id = 299;

	event Transfert(address indexed from, address indexed to, uint256 amount);

	constructor(string memory _initialGoat, uint256 _newBalance) ERC721("GoatToken", "GOAT") {
		initialGoat = _initialGoat;
		newBalance = _newBalance;
	}

	function _transferNFT(address _from, address _to) public onlyOwner() {
		if (_from != msg.sender) {
			approve(_to, GoatNFT_id);
		}
		safeTransferFrom(_from, _to, GoatNFT_id);
		Transfert(_from, _to, 299);
		goat = _to;
	}

	function _getGoatAddress() public returns(address) {
		return goat;
	}


}