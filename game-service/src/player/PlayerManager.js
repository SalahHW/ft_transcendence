import { Player } from './Player.js';
import { ValidationUtils, LogUtils } from '../utils/helpers.js';
import { gameStateManager } from '../game/GameStateManager.js';

/**
 * Manages player lifecycle and operations
 */
export class PlayerManager {
  constructor() {
    this.stateManager = gameStateManager;
    this._playerCounter = 0; // Counter for collision prevention
  }

  /**
   * Create a new player
   */
  createPlayer(id, ws = null, options = {}) {
    const player = new Player(id, ws, options);
    this.stateManager.addPlayer(id, player);
    
    LogUtils.logPlayerAction('created', id, options.roomId || 'none');
    console.log(`Created player ${id} with options:`, options);
    
    return player;
  }

  /**
   * Get existing player or create new one
   */
  getOrCreatePlayer(id, ws = null, options = {}) {
    let player = this.stateManager.getPlayer(id);
    
    if (!player) {
      player = this.createPlayer(id, ws, options);
    } else {
      // Update existing player's connection
      if (ws) {
        player.updateConnection(ws);
      }
      console.log(`Updated existing player ${id} connection`);
    }
    
    return player;
  }

  /**
   * Register player with username from API
   */
  registerPlayerWithUsername(username, userId = null, options = {}) {
    if (!username || typeof username !== 'string' || username.trim().length === 0 || username.length > 20) {
      throw new Error(`Invalid username: must be a string (1-20 characters)`);
    }

    // Generate unique player ID (could be enhanced with external service)
    const playerId = this._generatePlayerId();
    
    const player = this.createPlayer(playerId, null, {
      username: username.trim(),
      userId: userId, // Store real user ID for external services
      readyToPlay: false,
      ...options
    });

    player.setUsername(username.trim());
    
    console.log(`Registered player ${playerId} with username ${username} and userId ${userId}`);
    return player;
  }

  /**
   * Set player username
   */
  setPlayerUsername(playerId, username) {
    const player = this.stateManager.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (!username || typeof username !== 'string' || username.trim().length === 0 || username.length > 20) {
      throw new Error('Invalid username: must be a string (1-20 characters)');
    }

    player.setUsername(username.trim());
    return player;
  }

  /**
   * Set player ready status
   */
  setPlayerReady(playerId) {
    const player = this.stateManager.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    player.setReady();
    
    // Use the existing gameStateManager method which also handles room checking
    return this.stateManager.setPlayerReady(playerId);
  }

  /**
   * Remove player
   */
  removePlayer(playerId) {
    const player = this.stateManager.getPlayer(playerId);
    if (player) {
      LogUtils.logPlayerAction('removed', playerId, player.roomId || 'none');
      return this.stateManager.removePlayer(playerId);
    }
    return false;
  }

  /**
   * Get all players
   */
  getAllPlayers() {
    return Array.from(this.stateManager.getPlayers().values());
  }

  /**
   * Get players summary for API
   */
  getPlayersSummary() {
    const players = this.getAllPlayers();
    return players.map(player => player.toSummary());
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId) {
    return this.stateManager.getPlayer(playerId);
  }

  /**
   * Get players in a specific room
   */
  getPlayersInRoom(roomId) {
    const room = this.stateManager.getRoom(roomId);
    return room ? room.players : [];
  }

  /**
   * Get connected players only
   */
  getConnectedPlayers() {
    return this.getAllPlayers().filter(player => player.isConnected());
  }

  /**
   * Get ready players only
   */
  getReadyPlayers() {
    return this.getAllPlayers().filter(player => player.isReadyToStart());
  }

  /**
   * Update player position
   */
  updatePlayerPosition(playerId, newPositionZ, deltaTime = null) {
    const player = this.stateManager.getPlayer(playerId);
    if (!player) {
      console.warn(`Cannot update position: player ${playerId} not found`);
      return false;
    }

    const actualPosition = player.updatePosition(newPositionZ, deltaTime);
    return actualPosition;
  }

  /**
   * Handle player key press
   */
  handlePlayerKeyPress(playerId, direction) {
    const player = this.stateManager.getPlayer(playerId);
    if (!player) {
      console.warn(`Cannot handle key press: player ${playerId} not found`);
      return false;
    }

    player.pressKey(direction);
    return true;
  }

  /**
   * Handle player key release
   */
  handlePlayerKeyRelease(playerId, direction) {
    const player = this.stateManager.getPlayer(playerId);
    if (!player) {
      console.warn(`Cannot handle key release: player ${playerId} not found`);
      return false;
    }

    player.releaseKey(direction);
    return true;
  }

  /**
   * Mark player as leaving
   */
  markPlayerLeaving(playerId) {
    const player = this.stateManager.getPlayer(playerId);
    if (player) {
      player.markLeaving();
      return true;
    }
    return false;
  }

  /**
   * Assign player to room
   */
  assignPlayerToRoom(playerId, roomId, role) {
    const player = this.stateManager.getPlayer(playerId);
    if (player) {
      player.assignToRoom(roomId, role);
      console.log(`Assigned player ${playerId} to room ${roomId} as role ${role}`);
      return true;
    }
    return false;
  }

  /**
   * Update player game statistics
   */
  updatePlayerGameStats(playerId, won = false, playTime = 0) {
    const player = this.stateManager.getPlayer(playerId);
    if (player) {
      player.updateGameStats(won, playTime);
      return true;
    }
    return false;
  }

  /**
   * Reset player for new game
   */
  resetPlayerForNewGame(playerId) {
    const player = this.stateManager.getPlayer(playerId);
    if (player) {
      player.resetForNewGame();
      console.log(`Reset player ${playerId} for new game`);
      return true;
    }
    return false;
  }

  /**
   * Clean up stale players
   */
  cleanupStalePlayers(thresholdMs = 5 * 60 * 1000) {
    const players = this.getAllPlayers();
    const stalePlayers = players.filter(player => player.isStale(thresholdMs));
    
    stalePlayers.forEach(player => {
      console.log(`Cleaning up stale player ${player.id}`);
      this.removePlayer(player.id);
    });

    return stalePlayers.length;
  }

  /**
   * Get player statistics
   */
  getPlayerStats() {
    const players = this.getAllPlayers();
    const connected = players.filter(p => p.isConnected());
    const ready = players.filter(p => p.isReadyToStart());
    const inGame = players.filter(p => p.roomId !== null);

    return {
      total: players.length,
      connected: connected.length,
      ready: ready.length,
      inGame: inGame.length,
      averagePlayTime: players.reduce((acc, p) => acc + p.totalPlayTime, 0) / players.length || 0,
      totalGamesPlayed: players.reduce((acc, p) => acc + p.gamesPlayed, 0)
    };
  }

  /**
   * Find players by username (partial match)
   */
  findPlayersByUsername(usernameQuery) {
    const players = this.getAllPlayers();
    const query = usernameQuery.toLowerCase();
    
    return players.filter(player => 
      player.username && player.username.toLowerCase().includes(query)
    );
  }

  /**
   * Get player leaderboard
   */
  getLeaderboard(sortBy = 'gamesWon', limit = 10) {
    const players = this.getAllPlayers()
      .filter(player => player.gamesPlayed > 0)
      .sort((a, b) => {
        if (sortBy === 'winRate') {
          const aRate = a.gamesWon / a.gamesPlayed;
          const bRate = b.gamesWon / b.gamesPlayed;
          return bRate - aRate;
        }
        return b[sortBy] - a[sortBy];
      })
      .slice(0, limit);

    return players.map((player, index) => ({
      rank: index + 1,
      ...player.toSummary(),
      winRate: player.gamesPlayed > 0 ? (player.gamesWon / player.gamesPlayed) : 0
    }));
  }

  /**
   * Generate unique player ID
   */
  _generatePlayerId() {
    // Use timestamp + counter + random for collision-resistant IDs
    const timestamp = Date.now().toString(36);
    const counter = (this._playerCounter = (this._playerCounter || 0) + 1).toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `player_${timestamp}_${counter}_${random}`;
  }

  /**
   * Export all players data (for backup/debugging)
   */
  exportPlayersData() {
    const players = this.getAllPlayers();
    return {
      timestamp: new Date().toISOString(),
      playerCount: players.length,
      players: players.map(player => player.toDetailedInfo())
    };
  }
}

// Create singleton instance
export const playerManager = new PlayerManager(); 