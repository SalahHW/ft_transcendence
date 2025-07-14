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
   * Get user wallet address by user ID
   * @param {string} userId - The user ID
   * @returns {Promise<string|null>} - The wallet address or null if not found
   */
  async getUserWallet(userId) {
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
   * Report match result to blockchain
   * @param {Object} matchData - Match data with player IDs and scores
   * @returns {Promise<string>} - Transaction hash
   */
  async reportMatch(matchData) {
    try {
      // Get wallet addresses for both players
      const [player1Wallet, player2Wallet] = await Promise.all([
        this.getUserWallet(matchData.winner.id),
        this.getUserWallet(matchData.loser.id)
      ]);

      if (!player1Wallet || !player2Wallet) {
        throw new Error('Could not retrieve wallet addresses for players');
      }

      // Use the match ID from the match data (already generated)
      if (!matchData.matchId && matchData.matchId !== 0) {
        throw new Error('Match data does not contain a valid match ID');
      }

      // Determine winner wallet (winner is the one with higher score)
      const winnerWallet = matchData.winner.score > matchData.loser.score ? player1Wallet : player2Wallet;
      const loserWallet = matchData.winner.score > matchData.loser.score ? player2Wallet : player1Wallet;

      // Prepare blockchain data
      const blockchainData = {
        player1: player1Wallet,
        player2: player2Wallet,
        matchId: matchData.matchId,
        player1Score: matchData.winner.score,
        player2Score: matchData.loser.score,
        winner: winnerWallet
      };

      console.log(`🔗 Reporting match to blockchain:`, blockchainData);

      const response = await axios.post(`${BLOCKCHAIN_SERVICE_URL}/report-match`, blockchainData, {
        timeout: 10000
      });

      if (response.status === 200 && response.data && response.data.success) {
        console.log(`✅ Match reported to blockchain successfully. Tx hash: ${response.data.transactionHash}`);
        return response.data.transactionHash;
      } else {
        throw new Error('Blockchain service returned unsuccessful response');
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
      // Get wallet address for tournament winner (1st place)
      const winnerWallet = await this.getUserWallet(tournamentData.winner.id);

      if (!winnerWallet) {
        throw new Error('Could not retrieve wallet address for tournament winner');
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
        throw new Error('Blockchain service returned unsuccessful response');
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