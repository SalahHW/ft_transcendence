/**
 * Abstract base class for disconnect handlers
 * Provides common functionality for both 1v1 and tournament disconnect handling
 */

import { gameStateManager } from '../../game/GameStateManager.js';
import { LogUtils, TimeUtils } from '../../utils/helpers.js';

/**
 * Player connection states
 */
export const PlayerStates = {
  WAITING: 'waiting',
  LOADING: 'loading',
  ANNOUNCEMENT: 'announcement',
  LAUNCH_ANIMATION: 'launch_animation',
  PLAYING: 'playing',
  GAME_OVER: 'game_over'
};

/**
 * Room states
 */
export const RoomStates = {
  WAITING_FOR_PLAYERS: 'waiting_for_players',
  READY_TO_START: 'ready_to_start',
  IN_PROGRESS: 'in_progress',
  FINISHED: 'finished'
};

/**
 * Match types
 */
export const MatchTypes = {
  ONE_V_ONE: '1v1',
  TOURNAMENT: 'tournament'
};

/**
 * Disconnection reasons
 */
export const DisconnectionReasons = {
  PLAYER_LEFT: 'player_left',
  BROWSER_REFRESH: 'browser_refresh',
  BROWSER_NAVIGATION: 'browser_navigation',
  BROWSER_CLOSE: 'browser_close',
  NETWORK_DISCONNECT: 'network_disconnect',
  TIMEOUT: 'timeout',
  UNEXPECTED: 'unexpected'
};

/**
 * WebSocket close codes
 */
export const WebSocketCloseCodes = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  NO_STATUS: 1005,
  ABNORMAL: 1006
};

/**
 * Abstract base class for disconnect handlers
 */
export class BaseDisconnectHandler {
  constructor() {
    this.connectionMetadata = new Map();
    this.stateHistory = new Map();
    this.heartbeatIntervals = new Map();
  }

  /**
   * Get match type from room
   */
  getMatchType(room) {
    return room.matchType || MatchTypes.ONE_V_ONE;
  }

  /**
   * Check if room is in a state that requires disconnect handling
   */
  shouldHandleDisconnection(room) {
    if (!room || room.isGameOver) {
      return false;
    }

    const matchType = this.getMatchType(room);
    return this.isValidMatchType(matchType) && room.players && room.players.length > 0;
  }

  /**
   * Validate match type
   */
  isValidMatchType(matchType) {
    return Object.values(MatchTypes).includes(matchType);
  }

  /**
   * Get player state for a specific room
   */
  getPlayerState(playerId, roomId) {
    const room = gameStateManager.getRoom(roomId);
    if (!room || !room.metadata || !room.metadata.playerStates) {
      console.log(`🔍 DEBUG: No player states found for player ${playerId} in room ${roomId}`);
      return PlayerStates.WAITING;
    }

    const playerState = room.metadata.playerStates[playerId];
    console.log(`🔍 DEBUG: Player ${playerId} state in room ${roomId}: ${playerState || 'undefined'}`);
    return playerState || PlayerStates.WAITING;
  }

  /**
   * Set player state for a specific room
   */
  setPlayerState(playerId, roomId, state) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.error(`❌ Room ${roomId} not found for setting player state`);
      return;
    }

    if (!room.metadata) {
      room.metadata = {};
    }
    if (!room.metadata.playerStates) {
      room.metadata.playerStates = {};
    }

    console.log(`🔧 Setting player ${playerId} state to ${state} in room ${roomId}`);
    room.metadata.playerStates[playerId] = state;
    console.log(`✅ Player ${playerId} state set to ${state} in room ${roomId}`);
  }

  /**
   * Log state transition for debugging
   */
  logStateTransition(playerId, roomId, fromState, toState) {
    const transition = {
      playerId,
      roomId,
      fromState,
      toState,
      timestamp: Date.now()
    };

    if (!this.stateHistory.has(roomId)) {
      this.stateHistory.set(roomId, []);
    }
    this.stateHistory.get(roomId).push(transition);
  }

  /**
   * Safely close WebSocket connection
   */
  cleanupWebSocket(ws) {
    if (!ws) return;

    try {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.close();
      }
    } catch (error) {
      console.error('Error closing WebSocket:', error);
    }
  }

  /**
   * Remove player from game state
   */
  removePlayerFromGame(playerId) {
    try {
      gameStateManager.removePlayer(playerId);
      this.connectionMetadata.delete(playerId);
      this.stopHeartbeat(playerId);
      console.log(`🧹 Removed player ${playerId} from game state`);
    } catch (error) {
      console.error(`Error removing player ${playerId}:`, error);
    }
  }

  /**
   * Start heartbeat monitoring for player
   */
  startHeartbeat(playerId, roomId, timeoutMs = 30000) {
    this.stopHeartbeat(playerId);

    const interval = setInterval(() => {
      const room = gameStateManager.getRoom(roomId);
      if (!room || !this.shouldHandleDisconnection(room)) {
        this.stopHeartbeat(playerId);
        return;
      }

      const player = gameStateManager.getPlayer(playerId);
      if (!player || !player.ws || player.ws.readyState !== 1) {
        console.log(`💓 Heartbeat timeout for player ${playerId}`);
        this.handleDisconnection(playerId, roomId, DisconnectionReasons.TIMEOUT);
        this.stopHeartbeat(playerId);
      }
    }, timeoutMs);

    this.heartbeatIntervals.set(playerId, interval);
    console.log(`💓 Started heartbeat for player ${playerId} (${timeoutMs}ms)`);
  }

  /**
   * Stop heartbeat monitoring for player
   */
  stopHeartbeat(playerId) {
    const interval = this.heartbeatIntervals.get(playerId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(playerId);
      console.log(`💓 Stopped heartbeat for player ${playerId}`);
    }
  }

  /**
   * Update player activity timestamp
   */
  updatePlayerActivity(playerId) {
    const metadata = this.connectionMetadata.get(playerId);
    if (metadata) {
      metadata.lastActivity = Date.now();
    }
  }

  /**
   * Set connection metadata
   */
  setConnectionMetadata(playerId, roomId, additionalData = {}) {
    this.connectionMetadata.set(playerId, {
      roomId,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      ...additionalData
    });
  }

  /**
   * Get disconnection reason from WebSocket close code
   */
  getDisconnectionReasonFromCloseCode(code) {
    switch (code) {
      case WebSocketCloseCodes.NORMAL:
        return DisconnectionReasons.BROWSER_NAVIGATION;
      case WebSocketCloseCodes.GOING_AWAY:
        return DisconnectionReasons.BROWSER_CLOSE;
      case WebSocketCloseCodes.NO_STATUS:
        return DisconnectionReasons.PLAYER_LEFT;
      case WebSocketCloseCodes.ABNORMAL:
        return DisconnectionReasons.NETWORK_DISCONNECT;
      default:
        return DisconnectionReasons.UNEXPECTED;
    }
  }

  /**
   * Abstract method to be implemented by specific handlers
   */
  handleDisconnection(playerId, roomId, reason) {
    throw new Error('handleDisconnection must be implemented by subclass');
  }

  /**
   * Abstract method to be implemented by specific handlers
   */
  handleExplicitLeave(playerId, roomId) {
    throw new Error('handleExplicitLeave must be implemented by subclass');
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      activeConnections: this.connectionMetadata.size,
      activeHeartbeats: this.heartbeatIntervals.size,
      connectionsDetail: Array.from(this.connectionMetadata.entries()).map(([playerId, data]) => ({
        playerId,
        ...data
      }))
    };
  }

  /**
   * Clean up all resources
   */
  cleanup() {
    // Stop all heartbeats
    for (const [playerId] of this.heartbeatIntervals) {
      this.stopHeartbeat(playerId);
    }

    // Clear metadata
    this.connectionMetadata.clear();
    this.stateHistory.clear();

    console.log('🧹 Base disconnect handler cleanup completed');
  }
} 