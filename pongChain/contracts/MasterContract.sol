// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./managers/MatchManager.sol";
import "./nfts/GoatNft.sol";
import "./nfts/TournamentNft.sol";
import "./tokens/PongToken.sol";

/**
 * @title MasterContract
 * @dev MasterContract to manage all the contracts
 */

contract MasterContract is Ownable {
    /**
     * @dev Variables to store contract addresses
     */

    MatchManager public matchManager;
    GoatNft public goatNft;
    TournamentNft public tournamentNft;
    PongToken public pongToken;

    /**
     * @dev Mapping to store player
     * string: player name to address mapping
     * address: player address
     */

    mapping(string => address) private players;

    /**
     * @dev Event to log match reported
     * @param matchId: match id
     * @param player1: player1 name
     * @param player2: player2 name
     * @param winner: winner address
     */

    event MatchReported(
        uint256 indexed matchId,
        address indexed player1,
        address indexed player2,
        address indexed winner
    );

    /**
     * @dev Event to log tournament reported
     * @param tournamentId: tournament id
     * @param winner: winner address
     */

    event TournamentReported(
        uint256 indexed tournamentId,
        uint256 endTimestamp,
        uint256[] matchIds,
        address indexed winner
    );

    /**
     * @dev Event to log player added
     * @param name: player name
     * @param playerAddress: player address
     */

    event PlayerAdded(string name, address playerAddress);

    /**
     * @dev tournamentTokenIds to store tournament token ids
     */

    uint256 public tournamentTokenIds;

    /**
     * @dev Constructor to initialize the contract
     * @param _goatNft: address of GoatNft contract
     * @param _pongToken: address of PongToken contract
     * @param _tournamentNft: address of TournamentNft contract
     */

    constructor(
        address _goatNft,
        address _pongToken,
        address _tournamentNft
    ) Ownable(msg.sender) {
        goatNft = GoatNft(_goatNft);
        pongToken = PongToken(_pongToken);
        tournamentNft = TournamentNft(_tournamentNft);
        tournamentTokenIds = 1;
    }

    /**
     * @dev Function to add player
     * @param _name: player name
     * @param _player: player address
     */

    function addPlayer(string memory _name, address _player) public onlyOwner {
        players[_name] = _player;
        mintTokens(_player, 100);
        emit PlayerAdded(_name, _player);
    }

    /**
     * @dev Function to get player address
     * @param _name: player name
     * @return player address
     */

    function getPlayerAddress(
        string memory _name
    ) public view onlyOwner returns (address) {
        return players[_name];
    }

    /**
     * @dev Function to mint tokens
     * @param _to: address to mint tokens
     * @param _amount: amount of tokens to mint
     */

    function mintTokens(address _to, uint256 _amount) public onlyOwner {
        pongToken.mint(_to, _amount);
    }

    /**
     * @dev Function to report match
     * @param matchId: match id
     * @param player1: player1 name
     * @param player2: player2 name
     * @param winner: winner address
     */

    function reportMatch(
        uint256 matchId,
        string memory player1,
        string memory player2,
        address winner
    ) public onlyOwner {
        if (goatNft.getNftBalance() < pongToken.balanceOf(winner)) {
            updateGoatNft(winner);
        }
        mintTokens(winner, 10);
        address loser = (getPlayerAddress(player1) != winner)
            ? getPlayerAddress(player1)
            : getPlayerAddress(player2);
        uint256 amountToBurn = calculateBurnAmount(loserBalance);
        pongToken.burn(loser, amountToBurn);
        emit MatchReported(
            matchId,
            getPlayerAddress(player1),
            getPlayerAddress(player2),
            winner
        );
    }

    function calculateBurnAmount(
        uint256 loserBalance
    ) internal onlyOwner returns (uint256) {
        if (balance <= 10) {
            return 0;
        } else if (balance < 20) {
            return balance - 10;
        } else {
            return 10;
        }
    }

    /**
     * @dev Function to mint tournament nft
     * @param _to: address to mint nft
     * @param tournamentId: tournament id
     */

    function mintTournamentNft(
        string _to,
        uint256 tournamentId
    ) public onlyOwner {
        tournamentNft.mint(
            getPlayerAddress(_to),
            tournamentTokenIds,
            tournamentId
        );
        tournamentTokenIds++;
    }

    /**
     * @dev Function to get amont of Pong the Goat owns
     * @return amount of Pong the Goat owns
     */

    function getGoatBalance() public view returns (uint256) {
        return goatNft.getNftBalance();
    }

    /**
     * @dev Function to update Goat NFT
     * @param winner: winner address
     */

    function updateGoatNft(address winner) internal onlyOwner {
        goatNft.updateGoatNft(winner);
    }

    /**
     * @dev Function to report tournament
     * @param endTimestamp: end timestamp of the tournament
     * @param matchIds: array of match ids (match have to be already
     * reported and this function called once all the matches are ended)
     * @param winner: winner address
     */

    function reportTournament(
        uint256 endTimestamp,
        uint256[] memory matchIds,
        address winner
    ) public onlyOwner {
        mintTournamentNft(winner, tournamentTokenIds);
        emit TournamentReported(
            tournamentTokenIds,
            endTimestamp,
            matchIds,
            winner
        );
    }
}
