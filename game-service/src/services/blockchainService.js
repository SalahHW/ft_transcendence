import axios from 'axios';

// Service URLs
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://users:3000';
const ID_SERVICE_URL = process.env.ID_SERVICE_URL || 'http://id:3007';
const BLOCKCHAIN_SERVICE_URL = process.env.BLOCKCHAIN_SERVICE_URL || 'http://blockchain:3001';

/**
 * Blockchain Service
 * Handles wallet fetching, ID generation, and blockchain reporting
 */
export class BlockchainService {
  constructor() {
    this.userWalletCache = new Map(); // Cache user ID -> wallet address
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
   * Generate a unique match ID by incrementing until finding an available one
   * @returns {Promise<number>} - The generated match ID
   */
  async generateMatchId() {
    let matchId = 0;
    const maxAttempts = 1000; // Prevent infinite loops
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.post(`${ID_SERVICE_URL}/ids`, {
          matchId: matchId
        }, {
          timeout: 5000
        });

        if (response.status === 201) {
          console.log(`✅ Generated match ID: ${matchId}`);
          return matchId;
        }
      } catch (error) {
        if (error.response && error.response.status === 409) {
          // ID already exists, try next one
          matchId++;
          attempts++;
          continue;
        }
        console.warn(`⚠️ Error generating match ID ${matchId}:`, error.message);
        matchId++;
        attempts++;
      }
    }

    // If we can't generate a proper ID, use a fallback timestamp-based ID
    const fallbackId = Math.floor(Date.now() / 1000) % 1000000; // Use timestamp as fallback
    console.warn(`⚠️ Using fallback match ID: ${fallbackId} (ID service unavailable)`);
    return fallbackId;
  }

  /**
   * Generate a unique tournament ID by incrementing until finding an available one
   * @returns {Promise<number>} - The generated tournament ID
   */
  async generateTournamentId() {
    let tournamentId = 0;
    const maxAttempts = 1000; // Prevent infinite loops
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.post(`${ID_SERVICE_URL}/ids`, {
          tournamentId: tournamentId
        }, {
          timeout: 5000
        });

        if (response.status === 201) {
          console.log(`✅ Generated tournament ID: ${tournamentId}`);
          return tournamentId;
        }
      } catch (error) {
        if (error.response && error.response.status === 409) {
          // ID already exists, try next one
          tournamentId++;
          attempts++;
          continue;
        }
        console.warn(`⚠️ Error generating tournament ID ${tournamentId}:`, error.message);
        tournamentId++;
        attempts++;
      }
    }

    // If we can't generate a proper ID, use a fallback timestamp-based ID
    const fallbackId = Math.floor(Date.now() / 1000) % 1000000; // Use timestamp as fallback
    console.warn(`⚠️ Using fallback tournament ID: ${fallbackId} (ID service unavailable)`);
    return fallbackId;
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
   * Report match result to blockchain
   * @param {Object} matchData - Match data with player IDs and scores
   * @returns {Promise<string>} - Transaction hash
   */
  async reportMatch(matchData) {
    try {
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

      // Use the match ID from the match data (already generated)
      if (!matchData.matchId && matchData.matchId !== 0) {
        throw new Error('Match data does not contain a valid match ID');
      }

      // Determine winner wallet (winner is the one with higher score)
      const winnerWallet = matchData.winner.score > matchData.loser.score ? player1Wallet : player2Wallet;
      // const loserWallet = matchData.winner.score > matchData.loser.score ? player2Wallet : player1Wallet;

      // Register players if needed (only if not already registered)
      const player1Name = matchData.winner.username || `Player_${matchData.winner.userId || matchData.winner.id}`;
      const player2Name = matchData.loser.username || `Player_${matchData.loser.userId || matchData.loser.id}`;

      const [player1Registered, player2Registered] = await Promise.all([
        this.registerPlayerIfNeeded(player1Wallet, player1Name),
        this.registerPlayerIfNeeded(player2Wallet, player2Name)
      ]);

      if (!player1Registered) {
        throw new Error(`Failed to register player1 ${player1Name} in blockchain contract`);
      }

      if (!player2Registered) {
        throw new Error(`Failed to register player2 ${player2Name} in blockchain contract`);
      }

      // Prepare blockchain data
      const blockchainData = {
        player1: player1Wallet,
        player2: player2Wallet,
        matchId: matchData.matchId,
        player1Score: matchData.winner.score,
        player2Score: matchData.loser.score,
        winner: winnerWallet,
        endTimestamp: Math.floor(Date.now() / 1000) // Current timestamp in seconds
      };

      console.log(`🔗 Reporting match to blockchain:`, blockchainData);
      console.log(`🔗 Wallet addresses - Player1: ${player1Wallet}, Player2: ${player2Wallet}, Winner: ${winnerWallet}`);

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
   * Report tournament result to blockchain
   * @param {Object} tournamentData - Tournament data with final standings and match IDs
   * @returns {Promise<string>} - Transaction hash
   */
  async reportTournament(tournamentData) {
    try {
      // Get wallet address for tournament winner (1st place) using real user ID
      const winnerWallet = await this.getUserWallet(tournamentData.winner.userId || tournamentData.winner.id);

      if (!winnerWallet) {
        throw new Error('Could not retrieve wallet address for tournament winner');
      }

      // Validate wallet address format (Ethereum address format)
      const walletRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!walletRegex.test(winnerWallet)) {
        throw new Error(`Invalid wallet address format for tournament winner: ${winnerWallet}`);
      }

      // Register winner if needed (only if not already registered)
      const winnerName = tournamentData.winner.username || `Player_${tournamentData.winner.userId || tournamentData.winner.id}`;
      const winnerRegistered = await this.registerPlayerIfNeeded(winnerWallet, winnerName);

      if (!winnerRegistered) {
        throw new Error(`Failed to register tournament winner ${winnerName} in blockchain contract`);
      }

      // Generate tournament ID
      const tournamentId = await this.generateTournamentId();

      // Prepare blockchain data
      const blockchainData = {
        endTimestamp: Math.floor(Date.now() / 1000), // Current timestamp in seconds
        matchIds: tournamentData.matchIds, // Array of match IDs from tournament matches
        winner: winnerWallet,
        tournamentTokenIds: [tournamentId] // Array with single tournament ID
      };

      console.log(`🔗 Reporting tournament to blockchain:`, blockchainData);

      const response = await axios.post(`${BLOCKCHAIN_SERVICE_URL}/report-tournament`, blockchainData, {
        timeout: 15000
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
}

// Export singleton instance
export const blockchainService = new BlockchainService(); 