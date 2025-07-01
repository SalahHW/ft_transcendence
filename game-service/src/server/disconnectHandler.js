/**
 * Base interface and utilities for disconnect handling
 * This serves as a foundation for both 1v1 and tournament disconnect handlers
 */

import { reportMatchResultsToAPI } from './api.js';
import { LogUtils, TimeUtils } from '../utils/helpers.js';

/**
 * Shared utilities that both disconnect handlers might need
 */
export class BaseDisconnectUtils {
  /**
   * Safely close a WebSocket connection
   */
  static cleanupWebSocket(ws) {
    if (ws?.readyState === 1) {
      try {
        ws.close();
      } catch (e) {
        console.error('Error closing WebSocket:', e);
      }
    }
  }
  
  /**
   * Report match results to external API with error handling
   */
  static async reportResults(matchData) {
    try {
      await reportMatchResultsToAPI(matchData);
      console.log(`✅ Results reported for room ${matchData.roomId}`);
    } catch (e) {
      console.error('❌ Failed to report results:', e);
    }
  }

  /**
   * Create base match data structure for forfeit scenarios
   */
  static createBaseForfeitMatchData(room, roomId, winner, loser, reason) {
    const matchEndTime = TimeUtils.getCurrentTimestamp();
    const matchStartTime = room.startTime || matchEndTime;
    
    return {
      roomId,
      matchStartTime,
      matchEndTime,
      matchDuration: TimeUtils.calculateMatchDuration(matchStartTime, matchEndTime),
      winner: {
        id: winner.id,
        username: winner.username || 'Anonymous',
        score: 11 // Award full score for forfeit win
      },
      loser: {
        id: loser.id,
        username: loser.username || 'Anonymous',
        score: room.ball?.player2?.playerScore || 0
      },
      gameStats: {
        totalRebounds: room.ball?.rebounds || 0,
        finalScore: `11-${room.ball?.player2?.playerScore || 0}`,
        ballSpeed: room.ball?.speed || 0,
        lastHitBy: room.ball?.wasHitByPlayer || null,
        forfeitReason: reason
      },
      serverTime: Date.now()
    };
  }

  /**
   * Schedule a room cleanup with safety checks
   */
  static scheduleRoomCleanup(roomId, gameStateManager, delayMs = 5000) {
    setTimeout(() => {
      const room = gameStateManager.getRoom(roomId);
      if (room) {
        gameStateManager.removeRoom(roomId);
        console.log(`🧹 Cleaned up room ${roomId} after ${delayMs}ms`);
      }
    }, delayMs);
  }
}

/**
 * Constants shared between disconnect handlers
 */
export const DisconnectReasons = {
  PLAYER_LEFT: 'player_left',
  DISCONNECT: 'disconnect',
  FORFEIT: 'forfeit',
  TIMEOUT: 'timeout',
  // Tournament specific reasons
  SEMI_FINAL_DISCONNECT: 'semi_final_disconnect',
  FINAL_DISCONNECT: 'final_disconnect',
  WAITING_ROOM_DISCONNECT: 'waiting_room_disconnect'
};

/**
 * Base class for disconnect handlers with common functionality
 */
export class BaseDisconnectHandler {
  constructor() {
    this.connectionMetadata = new Map();
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
   * Set connection metadata for a player
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
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      activeConnections: this.connectionMetadata.size,
      connectionsDetail: Array.from(this.connectionMetadata.entries()).map(([playerId, data]) => ({
        playerId,
        ...data
      }))
    };
  }
} 