import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';

/**
 * Represents a game room with players, ball, and game state
 */
export class Room {
  constructor(roomId, options = {}) {
    // Core identity
    this.id = roomId;
    this.createdAt = new Date().toISOString();
    this.startTime = options.startTime || null;
    
    // Players management
    this.players = [];
    this.maxPlayers = options.maxPlayers || 2;
    
    // Game state
    this.ready = false;
    this.isGameOver = false;
    this.gameStarted = false;
    
    // Ball management
    this.ball = null;
    this.ballUpdateSent = false;
    this.ballUpdateTimeout = null;
    
    // Match tracking
    this.matchData = {
      scoreHistory: [],
      rebounds: 0,
      duration: 0
    };
    
    // Room metadata
    this.metadata = {
      lastActivity: Date.now(),
      totalPlayTime: 0,
      playerStates: {}, // Initialize player states tracking
      ...options.metadata
    };
  }

  /**
   * Add player to room
   */
  addPlayer(player) {
    if (this.players.length >= this.maxPlayers) {
      throw new Error('Room is full');
    }
    
    if (this.players.find(p => p.id === player.id)) {
      throw new Error('Player already in room');
    }

    this.players.push(player);
    player.assignToRoom(this.id, this.players.length - 1);
    this.metadata.lastActivity = Date.now();
    
    console.log(`Player ${player.id} added to room ${this.id} (${this.players.length}/${this.maxPlayers})`);
    return this.players.length - 1; // Return role
  }

  /**
   * Remove player from room
   */
  removePlayer(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return false;
    }

    const removedPlayer = this.players.splice(playerIndex, 1)[0];
    this.metadata.lastActivity = Date.now();
    
    console.log(`Player ${playerId} removed from room ${this.id} (${this.players.length}/${this.maxPlayers})`);
    return removedPlayer;
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  /**
   * Get opponent of a player
   */
  getOpponent(playerId) {
    return this.players.find(p => p.id !== playerId);
  }

  /**
   * Check if room is full
   */
  isFull() {
    return this.players.length >= this.maxPlayers;
  }

  /**
   * Check if room is empty
   */
  isEmpty() {
    return this.players.length === 0;
  }

  /**
   * Check if all players are ready
   */
  areAllPlayersReady() {
    if (this.players.length !== this.maxPlayers) {
      return false;
    }

    return this.players.every(player => 
      player.username && 
      player.isConnected() && 
      player.readyToPlay
    );
  }

  /**
   * Check if room is ready for game
   */
  isReadyForGame() {
    return this.players.length === this.maxPlayers && 
           !this.isGameOver && 
           this.areAllPlayersReady();
  }

  /**
   * Set room as ready and start game
   */
  setReady() {
    if (!this.isReadyForGame()) {
      throw new Error('Room conditions not met for starting game');
    }

    this.ready = true;
    this.gameStarted = true;
    this.startTime = new Date().toISOString();
    console.log(`Room ${this.id} is now ready and game started`);
  }

  /**
   * Initialize ball for the room
   */
  initializeBall() {
    if (this.players.length < 2) {
      throw new Error('Need 2 players to initialize ball');
    }

    this.ball = new Ball(
      { playerId: this.players[0].id, playerScore: 0, username: this.players[0].username || 'Player 1' },
      { playerId: this.players[1].id, playerScore: 0, username: this.players[1].username || 'Player 2' },
      null, // gameEngine will be set by the caller
      this.id
    );
    
    // Set initial ball state
    this.ball.position = new BABYLON.Vector3(0, -2, 0);
    this.ball.velocity = new BABYLON.Vector3(0, 0, 0);
    this.ball.previousVelocity = new BABYLON.Vector3(0, 0, 0);
    this.ball.isRespawning = true;
    this.ball.respawnTime = 0;
    this.ball.hasValidPosition = true;
    
    console.log(`Ball initialized for room ${this.id}`);
    return this.ball;
  }

  /**
   * Reset ball for respawn
   */
  resetBall() {
    if (!this.ball) {
      this.initializeBall();
      return;
    }

    this.ball.position = new BABYLON.Vector3(0, -2, 0);
    this.ball.isRespawning = true;
    this.ball.respawnTime = 0;
    this.ball.hasValidPosition = true;
    this.ballUpdateSent = false;
    
    console.log(`Ball reset for room ${this.id}`);
  }

  /**
   * Update room activity
   */
  updateActivity() {
    this.metadata.lastActivity = Date.now();
  }

  /**
   * Mark game as over
   */
  endGame(winner = null, loser = null) {
    this.isGameOver = true;
    this.ready = false;
    
    if (this.startTime) {
      const endTime = new Date().toISOString();
      this.metadata.totalPlayTime = new Date(endTime) - new Date(this.startTime);
    }

    console.log(`Game ended in room ${this.id}`);
    
    return {
      roomId: this.id,
      winner,
      loser,
      endTime: new Date().toISOString(),
      duration: this.metadata.totalPlayTime
    };
  }

  /**
   * Update score in match history
   */
  updateScore(playerId, score) {
    this.matchData.scoreHistory.push({
      playerId,
      score,
      timestamp: Date.now()
    });
    this.updateActivity();
  }

  /**
   * Get current scores
   */
  getCurrentScores() {
    if (!this.ball) {
      return { player1: 0, player2: 0 };
    }

    return {
      [this.players[0].id]: this.ball.player1.playerScore,
      [this.players[1].id]: this.ball.player2.playerScore
    };
  }

  /**
   * Check if game should end based on score
   */
  shouldEndGame() {
    if (!this.ball) return false;
    
    return this.ball.player1.playerScore >= 11 || 
           this.ball.player2.playerScore >= 11;
  }

  /**
   * Get room statistics
   */
  getStats() {
    return {
      id: this.id,
      playerCount: this.players.length,
      maxPlayers: this.maxPlayers,
      isReady: this.ready,
      isGameOver: this.isGameOver,
      gameStarted: this.gameStarted,
      hasBall: !!this.ball,
      createdAt: this.createdAt,
      startTime: this.startTime,
      lastActivity: this.metadata.lastActivity,
      totalPlayTime: this.metadata.totalPlayTime,
      scoreHistory: this.matchData.scoreHistory.length
    };
  }

  /**
   * Get room summary for API responses
   */
  toSummary() {
    return {
      id: this.id,
      players: this.players.map(p => ({
        id: p.id,
        username: p.username || 'Anonymous',
        ready: p.readyToPlay,
        connected: p.isConnected()
      })),
      playerCount: this.players.length,
      maxPlayers: this.maxPlayers,
      status: this.getStatus(),
      scores: this.getCurrentScores(),
      createdAt: this.createdAt
    };
  }

  /**
   * Get detailed room info for debugging
   */
  toDetailedInfo() {
    return {
      ...this.toSummary(),
      ready: this.ready,
      isGameOver: this.isGameOver,
      gameStarted: this.gameStarted,
      ballState: this.ball ? {
        position: this.ball.position,
        velocity: this.ball.velocity,
        isRespawning: this.ball.isRespawning,
        rebounds: this.ball.rebounds
      } : null,
      matchData: this.matchData,
      metadata: this.metadata
    };
  }

  /**
   * Get room status string
   */
  getStatus() {
    if (this.isGameOver) return 'finished';
    if (this.ready && this.gameStarted) return 'playing';
    if (this.isFull() && this.areAllPlayersReady()) return 'ready';
    if (this.isFull()) return 'waiting_for_ready';
    return 'waiting_for_players';
  }

  /**
   * Cleanup room resources
   */
  cleanup() {
    if (this.ballUpdateTimeout) {
      clearTimeout(this.ballUpdateTimeout);
      this.ballUpdateTimeout = null;
    }
    
    this.players.forEach(player => {
      player.roomId = null;
      player.role = null;
    });
    
    this.players = [];
    this.ball = null;
    
    console.log(`Room ${this.id} cleaned up`);
  }

  /**
   * Check if room is stale (inactive for too long)
   */
  isStale(thresholdMs = 10 * 60 * 1000) { // 10 minutes default
    return Date.now() - this.metadata.lastActivity > thresholdMs;
  }

  /**
   * Set gameEngine and roomId on the ball object
   */
  setBallContext(gameEngine) {
    if (this.ball) {
      this.ball.gameEngine = gameEngine;
      this.ball.roomId = this.id;
      console.log(`Ball context set for room ${this.id}`);
    }
  }
} 