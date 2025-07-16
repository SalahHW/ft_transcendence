import axios from 'axios';

// Service URLs
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://users:3000';
const BLOCKCHAIN_SERVICE_URL = process.env.BLOCKCHAIN_SERVICE_URL || 'http://blockchain:3001';

/**
 * Blockchain Service
 * Handles wallet fetching and blockchain reporting (winner-only)
 */
export class BlockchainService {
  constructor() {
    this.userWalletCache = new Map(); // Cache user ID -> wallet address
    this.tournamentStartTimes = new Map(); // Cache tournament ID -> start timestamp
  }

  /**
   * Get user wallet address by user ID or player object
   * @param {string|Object} userIdOrPlayer - The user ID or player object
   * @returns {Promise<string|null>} - The wallet address or null if not found
   */
  async getUserWallet(userIdOrPlayer) {
    // Handle userId (string or number) and player object
    let userId;
    if (typeof userIdOrPlayer === 'string' || typeof userIdOrPlayer === 'number') {
      userId = userIdOrPlayer;
    } else if (userIdOrPlayer && userIdOrPlayer.userId) {
      userId = userIdOrPlayer.userId;
    } else {
      console.warn(`⚠️ Invalid userIdOrPlayer parameter:`, userIdOrPlayer);
      return null;
    }

    // Check cache first
    if (this.userWalletCache.has(userId)) {
      return this.userWalletCache.get(userId);
    }

    try {
      const response = await axios.get(`${USERS_SERVICE_URL}/users/id/${userId}`, {
        timeout: 5000
      });

      if (response.status === 200 && response.data && response.data.wallet) {
        const wallet = response.data.wallet;
        // Cache the wallet address
        this.userWalletCache.set(userId, wallet);
        console.log(`📱 Retrieved wallet ${wallet} for user ${userId}`);
        return wallet;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to get wallet for user ${userId}:`, error.message);
    }

    return null;
  }

  /**
   * Generate a simple timestamp-based ID
   * @returns {number} - The generated ID
   */
  generateSimpleId() {
    return Math.floor(Date.now() / 1000) % 1000000;
  }

  /**
   * Store tournament start timestamp
   * @param {string} tournamentId - Tournament identifier
   * @param {number} startTimestamp - Tournament start timestamp
   */
  storeTournamentStartTime(tournamentId, startTimestamp) {
    this.tournamentStartTimes.set(tournamentId, startTimestamp);
    console.log(`🕒 Stored start time ${startTimestamp} for tournament ${tournamentId}`);
  }

  /**
   * Get tournament start timestamp
   * @param {string} tournamentId - Tournament identifier
   * @returns {number|null} - Tournament start timestamp or null if not found
   */
  getTournamentStartTime(tournamentId) {
    return this.tournamentStartTimes.get(tournamentId) || null;
  }

  /**
   * Check if a player is registered in the blockchain contract
   * @param {string} walletAddress - The player's wallet address
   * @returns {Promise<boolean>} - Whether the player is registered
   */
  async isPlayerRegistered(walletAddress) {
    try {
      const response = await axios.get(`${BLOCKCHAIN_SERVICE_URL}/player/${walletAddress}`, {
        timeout: 5000
      });
      return response.status === 200 && response.data && response.data.success;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return false; // Player not found
      }
      console.warn(`⚠️ Error checking if player ${walletAddress} is registered:`, error.message);
      return false;
    }
  }

  /**
   * Register a player in the blockchain contract (only if not already registered)
   * @param {string} walletAddress - The player's wallet address
   * @param {string} playerName - The player's name
   * @returns {Promise<boolean>} - Success status
   */
  async registerPlayerIfNeeded(walletAddress, playerName) {
    try {
      // First check if player is already registered
      const isRegistered = await this.isPlayerRegistered(walletAddress);
      
      if (isRegistered) {
        console.log(`ℹ️ Player ${playerName} (${walletAddress}) already registered in blockchain contract`);
        return true;
      }

      // Player not registered, so register them
      console.log(`🔗 Registering player ${playerName} (${walletAddress}) in blockchain contract`);
      
      const response = await axios.post(`${BLOCKCHAIN_SERVICE_URL}/add-player`, {
        name: playerName,
        address: walletAddress
      }, {
        timeout: 10000
      });

      if (response.status === 200 && response.data && response.data.success) {
        console.log(`✅ Player ${playerName} registered successfully. Tx hash: ${response.data.transactionHash}`);
        return true;
      } else {
        console.error(`❌ Failed to register player ${playerName}:`, response.data);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to register player ${playerName}:`, error.message);
      return false;
    }
  }

  /**
   * Report match result to blockchain (WINNER ONLY)
   * @param {Object} matchData - Match data with player IDs and scores
   * @param {Object} options - Options object with isMatch1v1 and tournamentId
   * @returns {Promise<string>} - Transaction hash
   */
  async reportMatch(matchData, options = {}) {
    try {
      const { isMatch1v1 = true, tournamentId = null } = options;

      // Get wallet addresses for both players using real user IDs
      const [player1Wallet, player2Wallet] = await Promise.all([
        this.getUserWallet(matchData.winner.userId || matchData.winner.id),
        this.getUserWallet(matchData.loser.userId || matchData.loser.id)
      ]);

      if (!player1Wallet || !player2Wallet) {
        throw new Error('Could not retrieve wallet addresses for players');
      }

      // Validate wallet address format (Ethereum address format)
      const walletRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!walletRegex.test(player1Wallet)) {
        throw new Error(`Invalid wallet address format for player1: ${player1Wallet}`);
      }
      if (!walletRegex.test(player2Wallet)) {
        throw new Error(`Invalid wallet address format for player2: ${player2Wallet}`);
      }

      // Register both players (required for blockchain contract)
      const player1Name = matchData.winner.username || `Player_${matchData.winner.userId || matchData.winner.id}`;
      const player2Name = matchData.loser.username || `Player_${matchData.loser.userId || matchData.loser.id}`;
      const player1Registered = await this.registerPlayerIfNeeded(player1Wallet, player1Name);
      const player2Registered = await this.registerPlayerIfNeeded(player2Wallet, player2Name);

      if (!player1Registered || !player2Registered) {
        throw new Error(`Failed to register both players in blockchain contract`);
      }

      // Determine endTimestamp based on match type
      let endTimestamp;
      if (isMatch1v1) {
        // For 1v1 matches: use actual end time from match data
        endTimestamp = matchData.endTimestamp || Math.floor(Date.now() / 1000);
      } else {
        // For tournament matches: use tournament's start timestamp
        if (!tournamentId) {
          throw new Error('Tournament ID is required for tournament matches');
        }
        const tournamentStartTime = this.getTournamentStartTime(tournamentId);
        if (!tournamentStartTime) {
          throw new Error(`Tournament start time not found for tournament ${tournamentId}`);
        }
        endTimestamp = tournamentStartTime;
      }

      // Prepare blockchain data (WINNER ONLY) - only send data for the winner
      const blockchainData = {
        player1: player1Wallet,
        player2: player2Wallet,
        winner: player1Wallet, // Winner is the one with higher score
        player1Score: matchData.winner.score.toString(),
        player2Score: matchData.loser.score.toString(),
        endTimestamp: endTimestamp.toString()
      };

      console.log(`🔗 Reporting ${isMatch1v1 ? '1v1' : 'tournament'} match to blockchain (WINNER ONLY):`, blockchainData);
      console.log(`🔗 Winner wallet: ${player1Wallet}, EndTimestamp: ${endTimestamp}`);

      const response = await axios.post(`${BLOCKCHAIN_SERVICE_URL}/report-match`, blockchainData, {
        timeout: 10000
      });

      if (response.status === 200 && response.data && response.data.success) {
        console.log(`✅ Match reported to blockchain successfully. Tx hash: ${response.data.transactionHash}`);
        return response.data.transactionHash;
      } else {
        console.error(`❌ Blockchain service returned status ${response.status}:`, response.data);
        throw new Error(`Blockchain service returned status ${response.status}: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.error('❌ Failed to report match to blockchain:', error.message);
      throw error;
    }
  }

  /**
   * Report tournament result to blockchain (NEW FORMAT: with all matches)
   * @param {Object} tournamentData - Tournament data with winner and matches
   * @param {string} tournamentId - Tournament identifier
   * @returns {Promise<string>} - Transaction hash
   */
  async reportTournament(tournamentData, tournamentId) {
    try {
      // Tournament winner is already a wallet address
      const winnerWallet = tournamentData.winner;

      // Validate wallet address format (Ethereum address format)
      const walletRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!walletRegex.test(winnerWallet)) {
        throw new Error(`Invalid wallet address format for tournament winner: ${winnerWallet}`);
      }

      // Register winner if needed (only if not already registered)
      const winnerRegistered = await this.registerPlayerIfNeeded(winnerWallet, `Tournament_Winner_${tournamentId}`);
      if (!winnerRegistered) {
        throw new Error(`Failed to register tournament winner in blockchain contract`);
      }

      // Get tournament start timestamp
      const tournamentStartTime = this.getTournamentStartTime(tournamentId);
      if (!tournamentStartTime) {
        throw new Error(`Tournament start time not found for tournament ${tournamentId}`);
      }

      // Validate and prepare matches (they should already be in wallet format)
      const validatedMatches = [];
      const allPlayers = new Set();
      
      if (tournamentData.matches && Array.isArray(tournamentData.matches)) {
        for (const match of tournamentData.matches) {
          // Validate that all fields are wallet addresses
          if (!walletRegex.test(match.player1) || !walletRegex.test(match.player2) || !walletRegex.test(match.winner)) {
            console.warn(`⚠️ Skipping match due to invalid wallet format: ${match.player1} vs ${match.player2}`);
            continue;
          }
          
          // Collect all players for registration
          allPlayers.add(match.player1);
          allPlayers.add(match.player2);
          
          validatedMatches.push({
            player1: match.player1,
            player2: match.player2,
            winner: match.winner,
            player1Score: match.player1Score,
            player2Score: match.player2Score
          });
        }
      }
      
      // Register all players in the tournament
      console.log(`🔗 Registering ${allPlayers.size} players for tournament ${tournamentId}`);
      for (const playerWallet of allPlayers) {
        try {
          await this.registerPlayerIfNeeded(playerWallet, `Tournament_Player_${tournamentId}`);
        } catch (error) {
          console.warn(`⚠️ Failed to register player ${playerWallet}: ${error.message}`);
        }
      }

      // Prepare blockchain data format (flat structure as expected by API)
      const blockchainData = {
        endTimestamp: tournamentStartTime,
        winner: winnerWallet,
        matches: validatedMatches
      };

      console.log(`🔗 Reporting tournament to blockchain (NEW FORMAT):`, blockchainData);
      console.log(`🔗 Tournament has ${validatedMatches.length} matches`);

      const response = await axios.post(`${BLOCKCHAIN_SERVICE_URL}/report-tournament`, blockchainData, {
        timeout: 45000
      });

      if (response.status === 200 && response.data && response.data.success) {
        console.log(`✅ Tournament reported to blockchain successfully. Tx hash: ${response.data.transactionHash}`);
        return response.data.transactionHash;
      } else {
        console.error(`❌ Blockchain service returned status ${response.status}:`, response.data);
        throw new Error(`Blockchain service returned status ${response.status}: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.error('❌ Failed to report tournament to blockchain:', error.message);
      throw error;
    }
  }

  /**
   * Clear wallet cache for a specific user (called on disconnect)
   * @param {string} userId - The user ID to clear from cache
   */
  clearUserWalletCache(userId) {
    this.userWalletCache.delete(userId);
    console.log(`🧹 Cleared wallet cache for user ${userId}`);
  }

  /**
   * Clear all wallet cache (called on service shutdown)
   */
  clearAllWalletCache() {
    this.userWalletCache.clear();
    console.log('🧹 Cleared all wallet cache');
  }

  /**
   * Clear tournament start time cache
   * @param {string} tournamentId - Tournament identifier
   */
  clearTournamentStartTime(tournamentId) {
    this.tournamentStartTimes.delete(tournamentId);
    console.log(`🧹 Cleared tournament start time for ${tournamentId}`);
  }

  /**
   * Clear all tournament start times (called on service shutdown)
   */
  clearAllTournamentStartTimes() {
    this.tournamentStartTimes.clear();
    console.log('🧹 Cleared all tournament start times');
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService(); 