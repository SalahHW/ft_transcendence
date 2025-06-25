import { playerManager } from './PlayerManager.js';
import { GAME_CONFIG, MESSAGE_TYPES } from '../core/constants.js';
import { PositionUtils, ValidationUtils } from '../utils/helpers.js';

/**
 * Handles player input processing and validation
 */
export class PlayerInput {
  constructor() {
    this.playerManager = playerManager;
    
    // Anti-cheat tracking
    this.inputHistory = new Map(); // playerId -> array of recent inputs
    this.suspiciousPlayers = new Set();
    
    // Input throttling
    this.lastInputTime = new Map(); // playerId -> timestamp
    this.inputCounts = new Map(); // playerId -> count in current window
  }

  /**
   * Process player key down input
   */
  processKeyDown(playerId, direction) {
    if (!this._validateDirection(direction)) {
      return false;
    }

    const success = this.playerManager.handlePlayerKeyPress(playerId, direction);
    
    if (success) {
      this._recordInput(playerId, MESSAGE_TYPES.KEY_DOWN, { direction });
      console.log(`Player ${playerId} pressed ${direction}`);
    }
    
    return success;
  }

  /**
   * Process player key up input
   */
  processKeyUp(playerId, direction) {
    if (!this._validateDirection(direction)) {
      return false;
    }

    const success = this.playerManager.handlePlayerKeyRelease(playerId, direction);
    
    if (success) {
      this._recordInput(playerId, MESSAGE_TYPES.KEY_UP, { direction });
      console.log(`Player ${playerId} released ${direction}`);
    }
    
    return success;
  }

  /**
   * Process player paddle position update
   */
  processPaddlePosition(playerId, positionZ) {
    const player = this.playerManager.getPlayer(playerId);
    if (!player) {
      console.warn(`Cannot update position: player ${playerId} not found`);
      return false;
    }

    // Simple validation
    if (typeof positionZ !== 'number' || isNaN(positionZ) || !isFinite(positionZ)) {
      console.warn(`Invalid position data for player ${playerId}:`, positionZ);
      return false;
    }

    player.positionZ = positionZ;
    player.lastActivity = Date.now();
    return positionZ;
  }

  /**
   * Process player movement based on current key states
   */
  processMovement(playerId, deltaTime) {
    const player = this.playerManager.getPlayer(playerId);
    if (!player) {
      return false;
    }

    const moved = player.updateMovement(deltaTime);
    
    if (moved) {
      this._recordInput(playerId, 'movement', { 
        positionZ: player.positionZ,
        deltaTime 
      });
    }
    
    return moved;
  }

  /**
   * Get player input summary
   */
  getPlayerInputSummary(playerId) {
    const player = this.playerManager.getPlayer(playerId);
    if (!player) {
      return null;
    }

    const history = this.inputHistory.get(playerId) || [];
    const recentInputs = history.slice(-10); // Last 10 inputs
    
    return {
      playerId,
      currentPosition: player.positionZ,
      isUpPressed: player.isUpPressed,
      isDownPressed: player.isDownPressed,
      lastActivity: player.lastActivity,
      recentInputCount: recentInputs.length,
      recentInputs: recentInputs.map(input => ({
        type: input.type,
        timestamp: input.timestamp,
        data: input.data
      })),
      isSuspicious: this.suspiciousPlayers.has(playerId)
    };
  }

  /**
   * Validate input against anti-cheat measures
   */
  _validateInput(playerId, inputType, data) {
    // Check if player exists
    const player = this.playerManager.getPlayer(playerId);
    if (!player) {
      console.warn(`Input validation failed: player ${playerId} not found`);
      return false;
    }

    // Check input throttling
    if (!this._checkInputThrottling(playerId)) {
      console.warn(`Input throttling triggered for player ${playerId}`);
      return false;
    }

    // Validate input type specific data
    if (!this._validateInputData(inputType, data)) {
      console.warn(`Invalid input data for ${inputType} from player ${playerId}:`, data);
      return false;
    }

    return true;
  }

  /**
   * Validate position changes for anti-cheat
   */
  _validatePosition(playerId, newPositionZ) {
    const player = this.playerManager.getPlayer(playerId);
    if (!player) {
      return false;
    }

    // Check position bounds
    if (newPositionZ < -GAME_CONFIG.PADDLE_BOUNDARY || 
        newPositionZ > GAME_CONFIG.PADDLE_BOUNDARY) {
      console.warn(`Position out of bounds for player ${playerId}: ${newPositionZ}`);
      this._flagSuspiciousPlayer(playerId, 'position_out_of_bounds');
      return false;
    }

    // Check movement speed (anti-cheat)
    const now = Date.now();
    const deltaTime = (now - player.lastUpdate) / 1000;
    
    if (deltaTime > 0.001) { // Avoid division by zero
      const maxMovement = GAME_CONFIG.PADDLE_SPEED * deltaTime;
      const actualMovement = Math.abs(newPositionZ - player.positionZ);
      
      if (actualMovement > maxMovement + 0.1) { // Small tolerance
        console.warn(`Suspicious movement speed for player ${playerId}: ${actualMovement} vs max ${maxMovement}`);
        this._flagSuspiciousPlayer(playerId, 'excessive_movement_speed');
        return false;
      }
    }

    return true;
  }

  /**
   * Check input throttling to prevent spam
   */
  _checkInputThrottling(playerId) {
    const now = Date.now();
    const windowSize = 1000; // 1 second window
    const maxInputsPerWindow = 100; // Max inputs per second
    
    // Clean up old input counts
    const lastInput = this.lastInputTime.get(playerId) || 0;
    if (now - lastInput > windowSize) {
      this.inputCounts.set(playerId, 0);
    }

    // Check current input count
    const currentCount = this.inputCounts.get(playerId) || 0;
    if (currentCount >= maxInputsPerWindow) {
      this._flagSuspiciousPlayer(playerId, 'input_spam');
      return false;
    }

    // Update counters
    this.lastInputTime.set(playerId, now);
    this.inputCounts.set(playerId, currentCount + 1);
    
    return true;
  }

  /**
   * Validate input data based on type
   */
  _validateInputData(inputType, data) {
    switch (inputType) {
      case MESSAGE_TYPES.KEY_DOWN:
      case MESSAGE_TYPES.KEY_UP:
        return data.direction === 'up' || data.direction === 'down';
      
      case MESSAGE_TYPES.PADDLE_POSITION:
        return typeof data.positionZ === 'number' && 
               !isNaN(data.positionZ) && 
               isFinite(data.positionZ);
      
      default:
        return true;
    }
  }

  /**
   * Record input for analysis and debugging
   */
  _recordInput(playerId, inputType, data) {
    if (!this.inputHistory.has(playerId)) {
      this.inputHistory.set(playerId, []);
    }

    const history = this.inputHistory.get(playerId);
    const inputRecord = {
      type: inputType,
      timestamp: Date.now(),
      data: { ...data }
    };

    history.push(inputRecord);

    // Limit history size
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Flag player as suspicious
   */
  _flagSuspiciousPlayer(playerId, reason) {
    this.suspiciousPlayers.add(playerId);
    console.warn(`Player ${playerId} flagged as suspicious: ${reason}`);
    
    // Could implement additional actions here:
    // - Increase monitoring
    // - Temporary restrictions
    // - Admin notifications
  }

  /**
   * Clear suspicious flag for player
   */
  clearSuspiciousFlag(playerId) {
    this.suspiciousPlayers.delete(playerId);
    console.log(`Cleared suspicious flag for player ${playerId}`);
  }

  /**
   * Get anti-cheat statistics
   */
  getAntiCheatStats() {
    return {
      totalPlayersTracked: this.inputHistory.size,
      suspiciousPlayers: Array.from(this.suspiciousPlayers),
      suspiciousCount: this.suspiciousPlayers.size,
      activeInputSessions: this.lastInputTime.size,
      averageInputsPerPlayer: this._calculateAverageInputs()
    };
  }

  /**
   * Calculate average inputs per player
   */
  _calculateAverageInputs() {
    if (this.inputHistory.size === 0) return 0;
    
    const totalInputs = Array.from(this.inputHistory.values())
      .reduce((sum, history) => sum + history.length, 0);
    
    return totalInputs / this.inputHistory.size;
  }

  /**
   * Reset input tracking for player
   */
  resetPlayerInputTracking(playerId) {
    this.inputHistory.delete(playerId);
    this.lastInputTime.delete(playerId);
    this.inputCounts.delete(playerId);
    this.suspiciousPlayers.delete(playerId);
    
    console.log(`Reset input tracking for player ${playerId}`);
  }

  /**
   * Clean up input tracking for disconnected players
   */
  cleanupDisconnectedPlayers() {
    const connectedPlayerIds = new Set(
      this.playerManager.getConnectedPlayers().map(p => p.id)
    );

    // Clean up input history for disconnected players
    for (const playerId of this.inputHistory.keys()) {
      if (!connectedPlayerIds.has(playerId)) {
        this.resetPlayerInputTracking(playerId);
      }
    }
  }

  /**
   * Export input data for analysis
   */
  exportInputData() {
    return {
      timestamp: new Date().toISOString(),
      antiCheatStats: this.getAntiCheatStats(),
      playerInputSummaries: Array.from(this.inputHistory.keys()).map(playerId => 
        this.getPlayerInputSummary(playerId)
      )
    };
  }

  _validateDirection(direction) {
    return direction === 'up' || direction === 'down';
  }
}

// Create singleton instance
export const playerInput = new PlayerInput(); 