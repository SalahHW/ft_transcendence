/**
 * Tournament Asset Disposal Manager
 * Handles cleanup of game assets between tournament matches and at tournament end
 */

import { gameStateManager } from '../../game/GameStateManager.js';

/**
 * Asset disposal states
 */
export const DisposalStates = {
  IDLE: 'idle',
  DISPOSING: 'disposing',
  VERIFYING: 'verifying',
  COMPLETED: 'completed',
  ERROR: 'error'
};

/**
 * Asset types that need disposal
 */
export const AssetTypes = {
  BALL: 'ball',
  PLAYER_POWERUP: 'player_powerup',
  BALL_POWERUP: 'ball_powerup',
  BALL_TRAIL: 'ball_trail',
  BALL_EFFECTS: 'ball_effects',
  ANIMATION_STATUS: 'animation_status',
  GAME_STATE: 'game_state'
};

/**
 * Tournament Asset Disposal Manager
 */
export class TournamentAssetDisposalManager {
  constructor() {
    this.disposalQueue = new Map(); // roomId -> array of disposal operations
    this.disposalStatus = new Map(); // roomId -> disposal state
    this.disposalLogs = new Map(); // roomId -> array of disposal logs
    this.verificationTimeouts = new Map(); // roomId -> timeout reference
    
    // Disposal configuration
    this.VERIFICATION_TIMEOUT_MS = 5000; // 5 seconds
    this.DISPOSAL_RETRY_ATTEMPTS = 3;
  }

  /**
   * Queue asset disposal for a room
   */
  async queueAssetDisposal(roomId, assetTypes = Object.values(AssetTypes), options = {}) {
    console.log(`🗑️ Queuing asset disposal for room ${roomId}, assets: ${assetTypes.join(', ')}`);
    
    if (!this.disposalQueue.has(roomId)) {
      this.disposalQueue.set(roomId, []);
    }
    
    const queue = this.disposalQueue.get(roomId);
    const disposalOperation = {
      id: this._generateOperationId(),
      assetTypes,
      options,
      timestamp: Date.now(),
      retryCount: 0,
      status: DisposalStates.IDLE
    };
    
    queue.push(disposalOperation);
    this.disposalQueue.set(roomId, queue);
    
    // Log the disposal operation
    this._logDisposal(roomId, {
      operation: 'queued',
      assetTypes,
      timestamp: Date.now()
    });
    
    // Start disposal if no other disposal is in progress
    if (this.disposalStatus.get(roomId) !== DisposalStates.DISPOSING) {
      await this._processDisposalQueue(roomId);
    }
    
    return disposalOperation.id;
  }

  /**
   * Force immediate disposal of all assets for a room
   */
  async forceDisposeAllAssets(roomId) {
    console.log(`🗑️ Force disposing all assets for room ${roomId}`);
    
    this.disposalStatus.set(roomId, DisposalStates.DISPOSING);
    
    try {
      // Clear any existing queue
      this.disposalQueue.set(roomId, []);
      
      // Dispose all asset types
      const allAssetTypes = Object.values(AssetTypes);
      const disposalResults = await this._disposeAssets(roomId, allAssetTypes, { force: true });
      
      // Verify disposal
      const verificationResult = await this._verifyDisposal(roomId, allAssetTypes);
      
      if (verificationResult) {
        this.disposalStatus.set(roomId, DisposalStates.COMPLETED);
        console.log(`🗑️ Force disposal completed successfully for room ${roomId}`);
      } else {
        this.disposalStatus.set(roomId, DisposalStates.ERROR);
        console.error(`🗑️ Force disposal verification failed for room ${roomId}`);
      }
      
      return verificationResult;
      
    } catch (error) {
      console.error(`🗑️ Error during force disposal for room ${roomId}:`, error);
      this.disposalStatus.set(roomId, DisposalStates.ERROR);
      return false;
    }
  }

  /**
   * Dispose assets between tournament matches
   */
  async disposeBetweenMatches(roomId, matchType) {
    console.log(`🗑️ Disposing assets between matches for room ${roomId}, match type: ${matchType}`);
    
    // For tournament matches, we want to dispose most assets but keep some state
    const assetTypes = [
      AssetTypes.BALL,
      AssetTypes.BALL_POWERUP,
      AssetTypes.BALL_TRAIL,
      AssetTypes.BALL_EFFECTS,
      AssetTypes.ANIMATION_STATUS
    ];
    
    return await this.queueAssetDisposal(roomId, assetTypes, { 
      matchType,
      preservePlayerState: true 
    });
  }

  /**
   * Dispose all assets at tournament end
   */
  async disposeAtTournamentEnd(waitingRoomId) {
    console.log(`🗑️ Disposing all assets at tournament end for ${waitingRoomId}`);
    
    // Get all tournament rooms for this waiting room
    const waitingRoomData = this._getWaitingRoomData(waitingRoomId);
    if (!waitingRoomData) {
      console.error(`🗑️ No waiting room data found for ${waitingRoomId}`);
      return false;
    }
    
    const roomIds = [
      waitingRoomData.tournamentRooms.semiFinalA.id,
      waitingRoomData.tournamentRooms.semiFinalB.id,
      waitingRoomData.tournamentRooms.winnerFinal.id,
      waitingRoomData.tournamentRooms.loserFinal.id
    ];
    
    const disposalPromises = roomIds.map(roomId => 
      this.forceDisposeAllAssets(roomId)
    );
    
    try {
      const results = await Promise.all(disposalPromises);
      const allSuccessful = results.every(result => result === true);
      
      if (allSuccessful) {
        console.log(`🗑️ All tournament assets disposed successfully for ${waitingRoomId}`);
      } else {
        console.error(`🗑️ Some tournament assets failed to dispose for ${waitingRoomId}`);
      }
      
      return allSuccessful;
      
    } catch (error) {
      console.error(`🗑️ Error disposing tournament assets for ${waitingRoomId}:`, error);
      return false;
    }
  }

  /**
   * Get disposal status for a room
   */
  getDisposalStatus(roomId) {
    const queue = this.disposalQueue.get(roomId) || [];
    const status = this.disposalStatus.get(roomId) || DisposalStates.IDLE;
    
    return {
      roomId,
      status,
      queueLength: queue.length,
      pendingOperations: queue.filter(op => op.status === DisposalStates.IDLE).length,
      inProgressOperations: queue.filter(op => op.status === DisposalStates.DISPOSING).length
    };
  }

  /**
   * Get disposal logs for a room
   */
  getDisposalLogs(roomId) {
    return this.disposalLogs.get(roomId) || [];
  }

  /**
   * Clean up disposal manager for a room
   */
  cleanupRoom(roomId) {
    console.log(`🧹 Cleaning up disposal manager for room ${roomId}`);
    
    // Clear timeout
    if (this.verificationTimeouts.has(roomId)) {
      clearTimeout(this.verificationTimeouts.get(roomId));
      this.verificationTimeouts.delete(roomId);
    }
    
    // Remove queue and status
    this.disposalQueue.delete(roomId);
    this.disposalStatus.delete(roomId);
    
    // Keep logs for debugging (they'll be cleaned up by garbage collection)
    console.log(`🧹 Disposal manager cleaned up for room ${roomId}`);
  }

  /**
   * Process disposal queue for a room
   */
  async _processDisposalQueue(roomId) {
    const queue = this.disposalQueue.get(roomId) || [];
    if (queue.length === 0) {
      return;
    }
    
    const operation = queue.find(op => op.status === DisposalStates.IDLE);
    if (!operation) {
      return;
    }
    
    console.log(`🗑️ Processing disposal operation ${operation.id} for room ${roomId}`);
    
    this.disposalStatus.set(roomId, DisposalStates.DISPOSING);
    operation.status = DisposalStates.DISPOSING;
    
    try {
      const disposalResult = await this._disposeAssets(roomId, operation.assetTypes, operation.options);
      
      if (disposalResult) {
        // Verify disposal
        const verificationResult = await this._verifyDisposal(roomId, operation.assetTypes);
        
        if (verificationResult) {
          operation.status = DisposalStates.COMPLETED;
          this.disposalStatus.set(roomId, DisposalStates.COMPLETED);
          console.log(`🗑️ Disposal operation ${operation.id} completed successfully`);
        } else {
          operation.status = DisposalStates.ERROR;
          this.disposalStatus.set(roomId, DisposalStates.ERROR);
          console.error(`🗑️ Disposal operation ${operation.id} verification failed`);
        }
      } else {
        operation.status = DisposalStates.ERROR;
        this.disposalStatus.set(roomId, DisposalStates.ERROR);
        console.error(`🗑️ Disposal operation ${operation.id} failed`);
      }
      
      // Remove completed operation from queue
      const updatedQueue = queue.filter(op => op.id !== operation.id);
      this.disposalQueue.set(roomId, updatedQueue);
      
      // Process next operation if any
      if (updatedQueue.length > 0) {
        setTimeout(() => this._processDisposalQueue(roomId), 100);
      }
      
    } catch (error) {
      console.error(`🗑️ Error processing disposal operation ${operation.id}:`, error);
      operation.status = DisposalStates.ERROR;
      this.disposalStatus.set(roomId, DisposalStates.ERROR);
    }
  }

  /**
   * Dispose specific assets
   */
  async _disposeAssets(roomId, assetTypes, options = {}) {
    console.log(`🗑️ Disposing assets for room ${roomId}: ${assetTypes.join(', ')}`);
    
    const disposalPromises = assetTypes.map(assetType => 
      this._disposeAssetType(roomId, assetType, options)
    );
    
    try {
      const results = await Promise.all(disposalPromises);
      const allSuccessful = results.every(result => result === true);
      
      this._logDisposal(roomId, {
        operation: 'disposed',
        assetTypes,
        success: allSuccessful,
        timestamp: Date.now()
      });
      
      return allSuccessful;
      
    } catch (error) {
      console.error(`🗑️ Error disposing assets for room ${roomId}:`, error);
      return false;
    }
  }

  /**
   * Dispose a specific asset type
   */
  async _disposeAssetType(roomId, assetType, options = {}) {
    try {
      switch (assetType) {
        case AssetTypes.BALL:
          return await this._disposeBall(roomId, options);
          
        case AssetTypes.PLAYER_POWERUP:
          return await this._disposePlayerPowerups(roomId, options);
          
        case AssetTypes.BALL_POWERUP:
          return await this._disposeBallPowerup(roomId, options);
          
        case AssetTypes.BALL_TRAIL:
          return await this._disposeBallTrail(roomId, options);
          
        case AssetTypes.BALL_EFFECTS:
          return await this._disposeBallEffects(roomId, options);
          
        case AssetTypes.ANIMATION_STATUS:
          return await this._disposeAnimationStatus(roomId, options);
          
        case AssetTypes.GAME_STATE:
          return await this._disposeGameState(roomId, options);
          
        default:
          console.warn(`🗑️ Unknown asset type: ${assetType}`);
          return true;
      }
    } catch (error) {
      console.error(`🗑️ Error disposing ${assetType} for room ${roomId}:`, error);
      return false;
    }
  }

  /**
   * Dispose ball assets
   */
  async _disposeBall(roomId, options = {}) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`🗑️ Room ${roomId} not found for ball disposal`);
      return true;
    }
    
    // ⭐ CRITICAL FIX: Properly dispose the ball object to prevent it from moving during finals
    if (room.ball) {
      // Stop ball movement by setting velocity to zero
      if (room.ball.velocity) {
        room.ball.velocity.set(0, 0, 0);
      }
      if (room.ball.previousVelocity) {
        room.ball.previousVelocity.set(0, 0, 0);
      }
      
      // Reset ball state to prevent respawning
      room.ball.isRespawning = false;
      room.ball.respawnTime = 0;
      room.ball.hasValidPosition = false;
      
      // Clear ball references to prevent memory leaks
      room.ball.gameEngine = null;
      room.ball.roomId = null;
      
      // ⭐ CRITICAL: Nullify the ball object to stop all movement
      room.ball = null;
      
      console.log(`🗑️ Ball object nullified for room ${roomId}`);
    }
    
    // ⭐ CRITICAL FIX: Set flag to prevent ball recreation
    room.ballDisposed = true;
    console.log(`🗑️ Ball disposal flag set for room ${roomId}`);
    
    // ⭐ CRITICAL FIX: Send final sync message with ballState: null to explicitly stop client processing
    try {
      const { gameEngine } = require('../../game/GameEngine.js');
      gameEngine.broadcastToRoom(roomId, {
        type: 'sync',
        playerPositions: {},
        ballState: null,
        serverTime: Date.now(),
        roomId: roomId,
        isDelta: true,
        ballDisposed: true // ⭐ NEW: Flag to indicate ball has been disposed
      });
      console.log(`🗑️ Sent final sync message with ballState: null for room ${roomId}`);
    } catch (error) {
      console.error(`🗑️ Error sending final sync message for room ${roomId}:`, error);
    }
    
    // Reset ball state for all players
    if (room.players) {
      room.players.forEach(player => {
        if (player.resetForNewGame) {
          player.resetForNewGame();
        }
      });
    }
    
    // Clear ball update flags
    room.ballUpdateSent = false;
    if (room.ballUpdateTimeout) {
      clearTimeout(room.ballUpdateTimeout);
      room.ballUpdateTimeout = null;
    }
    
    console.log(`🗑️ Ball assets disposed for room ${roomId}`);
    return true;
  }

  /**
   * Dispose player powerup assets
   */
  async _disposePlayerPowerups(roomId, options = {}) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`🗑️ Room ${roomId} not found for player powerup disposal`);
      return true;
    }
    
    // Reset powerup states for all players
    if (room.players) {
      room.players.forEach(player => {
        if (player.powerup && player.powerup.reset) {
          player.powerup.reset();
        }
      });
    }
    
    console.log(`🗑️ Player powerup assets disposed for room ${roomId}`);
    return true;
  }

  /**
   * Dispose ball powerup assets
   */
  async _disposeBallPowerup(roomId, options = {}) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`🗑️ Room ${roomId} not found for ball powerup disposal`);
      return true;
    }
    
    // Reset ball powerup state
    if (room.ball && room.ball.powerup && room.ball.powerup.reset) {
      room.ball.powerup.reset();
    }
    
    // ⭐ CRITICAL FIX: Clear powerup references even if ball is null
    if (room.ball && room.ball.powerup) {
      room.ball.powerup = null;
    }
    
    console.log(`🗑️ Ball powerup assets disposed for room ${roomId}`);
    return true;
  }

  /**
   * Dispose ball trail assets
   */
  async _disposeBallTrail(roomId, options = {}) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`🗑️ Room ${roomId} not found for ball trail disposal`);
      return true;
    }
    
    // Reset ball trail
    if (room.ball && room.ball.ballTrail && room.ball.ballTrail.dispose) {
      room.ball.ballTrail.dispose();
    }
    
    // ⭐ CRITICAL FIX: Clear trail references even if ball is null
    if (room.ball && room.ball.ballTrail) {
      room.ball.ballTrail = null;
    }
    
    console.log(`🗑️ Ball trail assets disposed for room ${roomId}`);
    return true;
  }

  /**
   * Dispose ball effects assets
   */
  async _disposeBallEffects(roomId, options = {}) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`🗑️ Room ${roomId} not found for ball effects disposal`);
      return true;
    }
    
    // Clear any active ball effects
    if (room.ball) {
      // Reset glow effects
      if (room.ball.currentGlowColor) {
        room.ball.currentGlowColor = { r: 0, g: 0, b: 0 };
      }
      if (room.ball.isGlowing) {
        room.ball.isGlowing = false;
      }
      
      // ⭐ CRITICAL FIX: Clear all ball effect references
      if (room.ball.powerupEffects) {
        room.ball.powerupEffects.forEach(effect => {
          if (effect && effect.dispose) {
            effect.dispose();
          }
        });
        room.ball.powerupEffects = null;
      }
      
      // Clear any other effect references
      if (room.ball.trail) {
        room.ball.trail = null;
      }
      if (room.ball.ballMaterial) {
        room.ball.ballMaterial = null;
      }
    }
    
    console.log(`🗑️ Ball effects assets disposed for room ${roomId}`);
    return true;
  }

  /**
   * Dispose animation status
   */
  async _disposeAnimationStatus(roomId, options = {}) {
    // Clear animation status for the room
    gameStateManager.clearAnimationStatus(roomId);
    
    console.log(`🗑️ Animation status disposed for room ${roomId}`);
    return true;
  }

  /**
   * Dispose game state
   */
  async _disposeGameState(roomId, options = {}) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`🗑️ Room ${roomId} not found for game state disposal`);
      return true;
    }
    
    // Reset game state
    if (options.preservePlayerState !== true) {
      // Reset scores and game state
      if (room.players) {
        room.players.forEach(player => {
          if (player.playerScore !== undefined) {
            player.playerScore = 0;
          }
        });
      }
    }
    
    console.log(`🗑️ Game state disposed for room ${roomId}`);
    return true;
  }

  /**
   * Verify disposal completion
   */
  async _verifyDisposal(roomId, assetTypes) {
    try {
      const verificationPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Verification timeout'));
        }, this.VERIFICATION_TIMEOUT_MS);
        
        // Perform verification checks
        const verificationChecks = assetTypes.map(assetType => 
          this._verifyAssetTypeDisposal(roomId, assetType)
        );
        
        Promise.all(verificationChecks).then((results) => {
          clearTimeout(timeout);
          const allVerified = results.every(result => result === true);
          resolve(allVerified);
        }).catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      const result = await verificationPromise;
      console.log(`🔍 Disposal verification ${result ? 'successful' : 'failed'} for room ${roomId}`);
      return result;
      
    } catch (error) {
      console.error(`🔍 Disposal verification error for room ${roomId}:`, error);
      return false;
    }
  }

  /**
   * Verify disposal of a specific asset type
   */
  async _verifyAssetTypeDisposal(roomId, assetType) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      return true; // Room doesn't exist, consider disposal successful
    }
    
    switch (assetType) {
      case AssetTypes.BALL:
        // Verify ball state is reset
        return room.players ? room.players.every(p => p.playerScore === 0) : true;
        
      case AssetTypes.PLAYER_POWERUP:
        // Verify powerup states are reset
        return room.players ? room.players.every(p => !p.powerup || !p.powerup.isActive) : true;
        
      case AssetTypes.BALL_POWERUP:
        // Verify ball powerup is reset
        return room.ball ? (!room.ball.powerup || !room.ball.powerup.isSpeedBoosted) : true;
        
      case AssetTypes.ANIMATION_STATUS:
        // Verify animation status is cleared
        const animStatus = gameStateManager.getAnimationStatusForRoom(roomId);
        return animStatus.length === 0;
        
      default:
        return true; // Consider other asset types as successfully disposed
    }
  }

  /**
   * Get waiting room data (helper method)
   */
  _getWaitingRoomData(waitingRoomId) {
    // This method needs to be called with the waiting rooms map
    // For now, we'll handle this by passing the data from the caller
    return null;
  }

  /**
   * Set waiting rooms reference for disposal operations
   */
  setWaitingRooms(waitingRooms) {
    this.waitingRooms = waitingRooms;
  }

  /**
   * Dispose all assets at tournament end (with waiting rooms data)
   */
  async disposeAtTournamentEndWithData(waitingRoomId, waitingRoomData) {
    console.log(`🗑️ Disposing all assets at tournament end for ${waitingRoomId}`);
    
    if (!waitingRoomData || !waitingRoomData.tournamentRooms) {
      console.error(`🗑️ Invalid waiting room data for ${waitingRoomId}`);
      return false;
    }
    
    const roomIds = [
      waitingRoomData.tournamentRooms.semiFinalA.id,
      waitingRoomData.tournamentRooms.semiFinalB.id,
      waitingRoomData.tournamentRooms.winnerFinal.id,
      waitingRoomData.tournamentRooms.loserFinal.id
    ];
    
    const disposalPromises = roomIds.map(roomId => 
      this.forceDisposeAllAssets(roomId)
    );
    
    try {
      const results = await Promise.all(disposalPromises);
      const allSuccessful = results.every(result => result === true);
      
      if (allSuccessful) {
        console.log(`🗑️ All tournament assets disposed successfully for ${waitingRoomId}`);
      } else {
        console.error(`🗑️ Some tournament assets failed to dispose for ${waitingRoomId}`);
      }
      
      return allSuccessful;
      
    } catch (error) {
      console.error(`🗑️ Error disposing tournament assets for ${waitingRoomId}:`, error);
      return false;
    }
  }

  /**
   * Generate unique operation ID
   */
  _generateOperationId() {
    return `disposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log disposal operation
   */
  _logDisposal(roomId, logEntry) {
    if (!this.disposalLogs.has(roomId)) {
      this.disposalLogs.set(roomId, []);
    }
    
    const logs = this.disposalLogs.get(roomId);
    logs.push(logEntry);
    
    // Keep only last 50 logs
    if (logs.length > 50) {
      logs.splice(0, logs.length - 50);
    }
  }
}

// Create singleton instance
export const assetDisposalManager = new TournamentAssetDisposalManager(); 