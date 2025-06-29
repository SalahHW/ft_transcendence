import { GAME_CONFIG } from '../core/constants.js';
import { PositionUtils, TimeUtils } from '../utils/helpers.js';
import { PlayerPowerup } from './playerPowerup.js';

/**
 * Represents a game player with all their properties and state
 */
export class Player {
  constructor(id, ws = null, options = {}) {
    // Core identity
    this.id = id;
    this.ws = ws;
    this.username = options.username || null;
    
    // Game state
    this.positionZ = 0;
    this.isUpPressed = false;
    this.isDownPressed = false;
    this.readyToPlay = options.readyToPlay || false;
    this.isLeaving = false;
    this.tournament = options.tournament || false;
    
    // Timing and activity
    this.lastUpdate = Date.now();
    this.connectedAt = new Date().toISOString();
    this.lastActivity = Date.now();
    
    // Game scores and stats
    this.playerScore = 0;
    this.gamesPlayed = 0;
    this.gamesWon = 0;
    this.totalPlayTime = 0;
    
    // Metadata
    this.roomId = null;
    this.role = null; // 0 or 1 (left or right paddle)
    
    // ⭐ POWERUP INTEGRATION: Initialize powerup system
    this.powerup = new PlayerPowerup(id);
  }

  /**
   * Update player's WebSocket connection
   */
  updateConnection(ws) {
    this.ws = ws;
    this.lastActivity = Date.now();
  }

  /**
   * Set player username and mark as ready
   */
  setUsername(username) {
    this.username = username;
    this.readyToPlay = true;
    console.log(`Player ${this.id} set username to ${username}`);
  }

  /**
   * Update player position with validation
   */
  updatePosition(newPositionZ, deltaTime = null) {
    if (deltaTime === null) {
      const now = Date.now();
      deltaTime = (now - this.lastUpdate) / 1000;
      this.lastUpdate = now;
    }

    const safePosition = PositionUtils.calculateSafePosition(
      this.positionZ, 
      newPositionZ, 
      deltaTime
    );

    this.positionZ = safePosition;
    this.lastActivity = Date.now();
    return this.positionZ;
  }

  /**
   * Handle key press input
   */
  pressKey(direction) {
    this.lastActivity = Date.now();
    
    if (direction === 'up') {
      this.isUpPressed = true;
    } else if (direction === 'down') {
      this.isDownPressed = true;
    }
  }

  /**
   * Handle key release input
   */
  releaseKey(direction) {
    this.lastActivity = Date.now();
    
    if (direction === 'up') {
      this.isUpPressed = false;
    } else if (direction === 'down') {
      this.isDownPressed = false;
    }
  }

  /**
   * Update position based on current key states
   */
  updateMovement(deltaTime) {
    const speed = GAME_CONFIG.PADDLE_SPEED;
    const boundary = GAME_CONFIG.PADDLE_BOUNDARY;
    let moved = false;

    if (this.isUpPressed && !this.isDownPressed) {
      const newZ = this.positionZ - speed * deltaTime;
      this.positionZ = Math.max(-boundary, newZ);
      moved = newZ !== this.positionZ;
    } else if (this.isDownPressed && !this.isUpPressed) {
      const newZ = this.positionZ + speed * deltaTime;
      this.positionZ = Math.min(boundary, newZ);
      moved = newZ !== this.positionZ;
    }

    if (moved || this.isUpPressed || this.isDownPressed) {
      this.positionZ = Number(this.positionZ.toFixed(3));
      this.lastActivity = Date.now();
    }

    return moved;
  }

  /**
   * Mark player as ready to play
   */
  setReady() {
    this.readyToPlay = true;
    console.log(`Player ${this.id} is now ready to play`);
  }

  /**
   * Mark player as leaving the game
   */
  markLeaving() {
    this.isLeaving = true;
    console.log(`Player ${this.id} is leaving the game`);
  }

  /**
   * Set player's room and role
   */
  assignToRoom(roomId, role) {
    this.roomId = roomId;
    this.role = role;
  }

  /**
   * Update game statistics
   */
  updateGameStats(won = false, playTime = 0) {
    this.gamesPlayed++;
    if (won) {
      this.gamesWon++;
    }
    this.totalPlayTime += playTime;
  }

  /**
   * Reset player state for new game
   */
  resetForNewGame() {
    this.positionZ = 0;
    this.isUpPressed = false;
    this.isDownPressed = false;
    this.playerScore = 0;
    this.isLeaving = false;
    this.lastUpdate = Date.now();
  }

  /**
   * Check if player has an active WebSocket connection
   */
  isConnected() {
    return this.ws && this.ws.readyState === 1;
  }

  /**
   * Check if player is ready to start a game
   */
  isReadyToStart() {
    return this.username && this.isConnected() && this.readyToPlay;
  }

  /**
   * Get player connection duration in milliseconds
   */
  getConnectionDuration() {
    return Date.now() - new Date(this.connectedAt).getTime();
  }

  /**
   * Get time since last activity in milliseconds
   */
  getTimeSinceLastActivity() {
    return Date.now() - this.lastActivity;
  }

  /**
   * Check if player connection is stale
   */
  isStale(thresholdMs = 5 * 60 * 1000) { // 5 minutes default
    return this.getTimeSinceLastActivity() > thresholdMs;
  }

  /**
   * Get player summary for API responses
   */
  toSummary() {
    return {
      id: this.id,
      username: this.username || 'Anonymous',
      readyToPlay: this.readyToPlay,
      isConnected: this.isConnected(),
      positionZ: this.positionZ,
      gamesPlayed: this.gamesPlayed,
      gamesWon: this.gamesWon,
      tournament: this.tournament
    };
  }

  /**
   * Get detailed player info for debugging
   */
  toDetailedInfo() {
    return {
      ...this.toSummary(),
      roomId: this.roomId,
      role: this.role,
      isUpPressed: this.isUpPressed,
      isDownPressed: this.isDownPressed,
      isLeaving: this.isLeaving,
      lastActivity: this.lastActivity,
      connectedAt: this.connectedAt,
      timeSinceLastActivity: this.getTimeSinceLastActivity(),
      totalPlayTime: this.totalPlayTime
    };
  }

  /**
   * Clone player for safe operations
   */
  clone() {
    const cloned = new Player(this.id, null, {
      username: this.username,
      readyToPlay: this.readyToPlay
    });
    
    // Copy all properties
    Object.assign(cloned, this);
    cloned.ws = null; // Don't clone WebSocket connection
    
    return cloned;
  }

  /**
   * Update player state each frame
   */
  update(deltaTime, ballRebounds = 0) {
    // Update movement
    const moved = this.updateMovement(deltaTime);
    
    // ⭐ POWERUP INTEGRATION: Update powerup system with current ball state
    this.powerup.update(ballRebounds);
    
    return moved;
  }

  /**
   * Handle powerup activation request
   */
  activatePowerup(ballRebounds) {
            if (!this.powerup) {
            return false;
        }
        
        const success = this.powerup.activate(ballRebounds);
    return success;
  }

  /**
   * Get powerup state for client synchronization
   */
  getPowerupState() {
    return this.powerup ? this.powerup.getState() : null;
  }
} 