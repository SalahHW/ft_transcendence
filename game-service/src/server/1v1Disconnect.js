import { gameStateManager } from '../game/GameStateManager.js';
import { gameEngine } from '../game/GameEngine.js';
import { LogUtils } from '../utils/helpers.js';
import { playerManager } from '../player/PlayerManager.js';
import { BaseDisconnectHandler, BaseDisconnectUtils, DisconnectReasons } from './disconnectHandler.js';

/**
 * Server-side disconnection handling for 1v1 games
 * Handles player disconnections, cleanup, and forfeit logic
 */
export class DisconnectionHandler extends BaseDisconnectHandler {
  constructor() {
    super();
    this.disconnectionReasons = DisconnectReasons;
  }

  /**
   * Main entry point for handling player disconnection
   */
  handlePlayerDisconnect(playerId, roomId) {
    const player = gameStateManager.getPlayer(playerId);
    const isExplicitLeave = player?.isLeaving === true;
    
    console.log(`🔥 DISCONNECT HANDLER: Player ${playerId} from room ${roomId} ${isExplicitLeave ? '(EXPLICIT LEAVE)' : '(UNEXPECTED DISCONNECT)'}`);
    
    // Clean up player connection first
    this.cleanupPlayerConnection(playerId);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.log(`Room ${roomId} not found during disconnect`);
      return;
    }

    // Determine how to handle the disconnection based on game state
    if (this.isGameInProgress(room)) {
      this.handleGameInProgressDisconnect(playerId, roomId, isExplicitLeave);
    } else {
      this.handleRegularDisconnect(playerId, roomId);
    }
  }

  /**
   * Check if game is currently in progress
   */
  isGameInProgress(room) {
    return room.ready && !room.isGameOver && room.players.length === 2;
  }

  /**
   * Handle disconnection during active gameplay
   */
  handleGameInProgressDisconnect(playerId, roomId, isExplicitLeave) {
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`Could not find players in room ${roomId} for disconnect handling`);
      return;
    }

    const disconnectionReason = isExplicitLeave ? 
      this.disconnectionReasons.PLAYER_LEFT : 
      this.disconnectionReasons.DISCONNECT;
    
    const actionText = isExplicitLeave ? 'left the game' : 'disconnected during active game';
    console.log(`Player ${playerId} ${actionText}. Awarding win to ${remainingPlayer.id}`);
    
    // Mark game as over immediately
    room.isGameOver = true;
    
    // Create comprehensive match data for forfeit
    const baseMatchData = BaseDisconnectUtils.createBaseForfeitMatchData(
      room, 
      roomId, 
      remainingPlayer, 
      disconnectedPlayer, 
      actionText
    );

    const matchData = {
      ...baseMatchData,
      matchType: 'forfeit',
      disconnectionReason,
      gameStats: {
        ...baseMatchData.gameStats,
        disconnectionType: disconnectionReason
      }
    };

    // Log the forfeit for analytics
    LogUtils.logMatchCompletion(matchData);
    
    // Report results to external APIs
    BaseDisconnectUtils.reportResults(matchData);
    
    // Notify remaining player of the victory
    this.notifyRemainingPlayer(roomId, matchData);
    
    // Schedule room cleanup
    BaseDisconnectUtils.scheduleRoomCleanup(roomId, gameStateManager, 5000);
  }

  /**
   * Handle disconnection when game is not in progress
   */
  handleRegularDisconnect(playerId, roomId) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) return;

    console.log(`Handling regular disconnect for player ${playerId} in room ${roomId}`);

    // Remove player from room
    room.players = room.players.filter(p => p.id !== playerId);
    
    // Handle empty rooms
    if (room.players.length === 0) {
      gameStateManager.removeRoom(roomId);
      console.log(`Removed empty room ${roomId}`);
    } else {
      // Notify remaining players of the disconnection
      this.notifyPlayersOfDisconnection(roomId, playerId, room.players.length);
    }
  }

  /**
   * Clean up player connection and associated data
   */
  cleanupPlayerConnection(playerId) {
    const player = gameStateManager.getPlayer(playerId);
    
    if (player && player.ws) {
      BaseDisconnectUtils.cleanupWebSocket(player.ws);
    }
    
    // Remove player from game state
    gameStateManager.removePlayer(playerId);
    
    // Clean up connection metadata
    this.connectionMetadata.delete(playerId);
    
    console.log(`🧹 Cleaned up connection for player ${playerId}`);
  }

  /**
   * Notify remaining player of opponent disconnection
   */
  notifyRemainingPlayer(roomId, matchData) {
    const message = {
      type: 'gameEnd',
      ...matchData,
      reason: 'opponent_disconnect'
    };

    gameEngine.broadcastToRoom(roomId, message);
  }

  /**
   * Notify players of a disconnection (non-game scenario)
   */
  notifyPlayersOfDisconnection(roomId, disconnectedPlayerId, remainingPlayerCount) {
    gameEngine.broadcastToRoom(roomId, {
      type: 'playerDisconnected',
      playerId: disconnectedPlayerId,
      remainingPlayers: remainingPlayerCount
    });
    
    console.log(`📢 Notified ${remainingPlayerCount} remaining players in room ${roomId}`);
  }

  /**
   * Handle explicit leave game message
   */
  handleLeaveGameMessage(playerId, roomId) {
    console.log(`🏃 Player ${playerId} is explicitly leaving the game in room ${roomId}`);
    
    // Mark player as leaving to distinguish from unexpected disconnect
    playerManager.markPlayerLeaving(playerId);
    
    // Handle the disconnection
    this.handlePlayerDisconnect(playerId, roomId);
  }

  /**
   * Set up WebSocket disconnect event handlers
   */
  setupWebSocketDisconnectHandlers(ws, playerId, roomId) {
    ws.on('close', () => {
      console.log(`🚪 WebSocket closed for player ${playerId} in room ${roomId}`);
      this.handlePlayerDisconnect(playerId, roomId);
    });

    ws.on('error', (error) => {
      console.error(`🔥 WebSocket error for player ${playerId}:`, error);
      this.handlePlayerDisconnect(playerId, roomId);
    });
  }

  /**
   * Create a disconnect handler function for message routing
   */
  createDisconnectHandler(playerId, roomId) {
    return (disconnectPlayerId, disconnectRoomId) => {
      this.handlePlayerDisconnect(
        disconnectPlayerId || playerId, 
        disconnectRoomId || roomId
      );
    };
  }

  /**
   * Handle timeout-based disconnections
   */
  handleTimeoutDisconnect(playerId, roomId) {
    console.log(`⏰ Handling timeout disconnect for player ${playerId}`);
    
    const player = gameStateManager.getPlayer(playerId);
    if (player) {
      // Mark as timeout disconnect
      player.disconnectionReason = this.disconnectionReasons.TIMEOUT;
    }
    
    this.handlePlayerDisconnect(playerId, roomId);
  }
}

// Export the handler class
export const disconnectionHandler = new DisconnectionHandler();

// Export utility functions for backward compatibility
export function handlePlayerDisconnect(playerId, roomId) {
  return disconnectionHandler.handlePlayerDisconnect(playerId, roomId);
}

export function handleLeaveGameMessage(playerId, roomId) {
  return disconnectionHandler.handleLeaveGameMessage(playerId, roomId);
}

export function setupWebSocketDisconnectHandlers(ws, playerId, roomId) {
  return disconnectionHandler.setupWebSocketDisconnectHandlers(ws, playerId, roomId);
}

export function createDisconnectHandler(playerId, roomId) {
  return disconnectionHandler.createDisconnectHandler(playerId, roomId);
}

export function cleanupStaleConnections() {
  return disconnectionHandler.cleanupStaleConnections();
}
