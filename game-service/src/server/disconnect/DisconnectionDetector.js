/**
 * Disconnection detector and router
 * Monitors WebSocket events and routes disconnections to appropriate handlers
 */

import { oneVOneDisconnectHandler } from './OneVOneDisconnectHandler.js';
import { tournamentDisconnectHandler } from './TournamentDisconnectHandler.js';
import { tournamentMatchDisconnectHandler } from '../../tournament/disconnect/disconnectHandler.js';
import { MatchTypes } from './BaseDisconnectHandler.js';
import { gameStateManager } from '../../game/GameStateManager.js';
import { TournamentRoomTypes } from '../../tournament/constants.js';

/**
 * Disconnection detector and router
 */
export class DisconnectionDetector {
  constructor() {
    this.handlers = new Map();
    this.setupHandlers();
  }

  /**
   * Setup handlers for different match types
   */
  setupHandlers() {
    this.handlers.set(MatchTypes.ONE_V_ONE, oneVOneDisconnectHandler);
    this.handlers.set(MatchTypes.TOURNAMENT, tournamentDisconnectHandler);
  }

  /**
   * Get appropriate handler for match type and room
   */
  getHandler(matchType, roomId = null) {
    // For tournament matches, we need to check the room type to determine the correct handler
    if (matchType === MatchTypes.TOURNAMENT && roomId) {
      const room = gameStateManager.getRoom(roomId);
      if (room && this.isTournamentMatchRoom(room)) {
        console.log(`🏆 Using tournament match handler for room ${roomId} (${room.metadata?.roomType})`);
        return tournamentMatchDisconnectHandler;
      } else {
        console.log(`🏆 Using tournament waiting room handler for room ${roomId}`);
        return tournamentDisconnectHandler;
      }
    }
    
    return this.handlers.get(matchType) || oneVOneDisconnectHandler; // Default to 1v1
  }

  /**
   * Check if room is a tournament match room (not waiting room)
   */
  isTournamentMatchRoom(room) {
    if (!room || room.matchType !== 'tournament') {
      return false;
    }

    const roomType = room.metadata?.roomType;
    return roomType === TournamentRoomTypes.SEMI_FINAL_A ||
           roomType === TournamentRoomTypes.SEMI_FINAL_B ||
           roomType === TournamentRoomTypes.WINNER_FINAL ||
           roomType === TournamentRoomTypes.LOSER_FINAL;
  }

  /**
   * Setup disconnect detection for a WebSocket connection
   */
  setupDisconnectDetection(ws, playerId, roomId) {
    if (!ws) return;

    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`Room ${roomId} not found for disconnect detection setup`);
      return;
    }

    const matchType = room.matchType || MatchTypes.ONE_V_ONE;
    const handler = this.getHandler(matchType, roomId);

    // Set initial connection metadata (don't set up duplicate WebSocket handlers)
    handler.setConnectionMetadata(playerId, roomId, {
      matchType,
      setupTime: Date.now()
    });

    console.log(`🔍 Setup disconnect detection metadata for player ${playerId} in ${matchType} match`);
  }

  /**
   * Handle explicit leave game message
   */
  handleExplicitLeave(playerId, roomId) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`Room ${roomId} not found for explicit leave handling`);
      return;
    }

    const matchType = room.matchType || MatchTypes.ONE_V_ONE;
    const handler = this.getHandler(matchType, roomId);

    handler.handleExplicitLeave(playerId, roomId);
  }

  /**
   * Handle player state update from client
   */
  handlePlayerStateUpdate(playerId, roomId, state) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`Room ${roomId} not found for state update handling`);
      return;
    }

    const matchType = room.matchType || MatchTypes.ONE_V_ONE;
    const handler = this.getHandler(matchType, roomId);

    handler.handlePlayerStateUpdate(playerId, roomId, state);
  }

  /**
   * Handle browser events (called from client-side)
   */
  handleBrowserEvent(playerId, roomId, eventType) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`Room ${roomId} not found for browser event handling`);
      return;
    }

    const matchType = room.matchType || MatchTypes.ONE_V_ONE;
    const handler = this.getHandler(matchType, roomId);

    let reason;
    switch (eventType) {
      case 'beforeunload':
      case 'pagehide':
      case 'unload':
      case 'popstate':
      case 'visibility_timeout':
        reason = 'browser_navigation';
        break;
      case 'visibilitychange':
        // Don't treat visibility change as disconnect
        return;
      default:
        reason = 'browser_event';
    }

    console.log(`🌐 Browser event: ${eventType} for player ${playerId}`);
    handler.handleDisconnection(playerId, roomId, reason);
  }

  /**
   * Get connection statistics from all handlers
   */
  getConnectionStats() {
    const stats = {};
    
    for (const [matchType, handler] of this.handlers) {
      stats[matchType] = handler.getConnectionStats();
    }
    
    return stats;
  }

  /**
   * Clean up all handlers
   */
  cleanup() {
    for (const handler of this.handlers.values()) {
      handler.cleanup();
    }
    console.log('🧹 Disconnection detector cleanup completed');
  }
}

// Export singleton instance
export const disconnectionDetector = new DisconnectionDetector(); 