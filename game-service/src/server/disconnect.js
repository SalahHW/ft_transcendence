import { gameStateManager } from '../game/GameStateManager.js';
import { gameEngine } from '../game/GameEngine.js';
import { reportMatchResultsToAPI } from './api.js';
import { LogUtils, TimeUtils } from '../utils/helpers.js';
import { playerManager } from '../player/PlayerManager.js';
import { handleTournamentPlayerDisconnect } from './tournamentDisconnect.js';

/**
 * Server-side disconnection handling for 1v1 games
 * Handles player disconnections, cleanup, and forfeit logic
 */
export class DisconnectionHandler {
  constructor() {
    // Track connection metadata
    this.connectionMetadata = new Map();
    this.disconnectionReasons = {
      PLAYER_LEFT: 'player_left',
      DISCONNECT: 'disconnect',
      FORFEIT: 'forfeit',
      TIMEOUT: 'timeout'
    };
  }

  /**
   * Main entry point for handling player disconnection
   * Routes to appropriate handler based on room type
   */
  handlePlayerDisconnect(playerId, roomId) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.log(`Room ${roomId} not found during disconnect`);
      return;
    }

    // Check if this is a tournament room
    const isTournamentRoom = room.metadata?.isTournament === true || 
                           roomId.includes('tournament') || 
                           roomId.includes('semi') || 
                           roomId.includes('final');

    if (isTournamentRoom) {
      console.log(`🏆 Routing disconnect to tournament handler for player ${playerId} in room ${roomId}`);
      return handleTournamentPlayerDisconnect(playerId, roomId);
    }

    // Handle as regular 1v1 game
    console.log(`🎮 Handling 1v1 disconnect for player ${playerId} in room ${roomId}`);
    this.handle1v1PlayerDisconnect(playerId, roomId);
  }

  /**
   * Handle 1v1 game disconnection
   */
  handle1v1PlayerDisconnect(playerId, roomId) {
    const player = gameStateManager.getPlayer(playerId);
    const isExplicitLeave = player?.isLeaving === true;
    
    console.log(`🔥 1V1 DISCONNECT: Player ${playerId} from room ${roomId} ${isExplicitLeave ? '(EXPLICIT LEAVE)' : '(UNEXPECTED DISCONNECT)'}`);
    
    // Clean up player connection first
    this.cleanupPlayerConnection(playerId);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) return;

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
    const matchData = this.createForfeitMatchData(
      room, 
      roomId, 
      remainingPlayer, 
      disconnectedPlayer, 
      actionText,
      disconnectionReason
    );

    // Log the forfeit for analytics
    LogUtils.logMatchCompletion(matchData);
    
    // Report results to external APIs
    this.reportForfeitResults(matchData);
    
    // Notify remaining player of the victory
    this.notifyRemainingPlayer(roomId, matchData);
    
    // Schedule room cleanup
    this.scheduleRoomCleanup(roomId, 5000);
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
   * Create comprehensive match data for forfeit scenarios
   */
  createForfeitMatchData(room, roomId, winner, loser, reason, disconnectionReason) {
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
        forfeitReason: reason,
        disconnectionType: disconnectionReason
      },
      matchType: 'forfeit',
      serverTime: Date.now(),
      disconnectionReason
    };
  }

  /**
   * Clean up player connection and associated data
   */
  cleanupPlayerConnection(playerId) {
    const player = gameStateManager.getPlayer(playerId);
    
    if (player && player.ws) {
      try {
        if (player.ws.readyState === 1) {
          player.ws.close();
        }
      } catch (e) {
        console.error(`Error closing WebSocket for player ${playerId}:`, e);
      }
    }
    
    // Remove player from game state
    gameStateManager.removePlayer(playerId);
    
    // Clean up connection metadata
    this.connectionMetadata.delete(playerId);
    
    console.log(`🧹 Cleaned up connection for player ${playerId}`);
  }

  /**
   * Report forfeit results to external APIs
   */
  async reportForfeitResults(matchData) {
    try {
      await reportMatchResultsToAPI(matchData);
      console.log(`✅ Forfeit results reported for room ${matchData.roomId}`);
    } catch (err) {
      console.error('❌ Failed to report forfeit results:', err.message);
    }
  }

  /**
   * Notify remaining player of opponent disconnection
   */
  notifyRemainingPlayer(roomId, matchData) {
    gameEngine.broadcastToRoom(roomId, {
      type: 'gameEnd',
      ...matchData,
      reason: 'opponent_disconnect'
    });
    
    console.log(`📢 Notified remaining player in room ${roomId} of opponent disconnect`);
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
   * Schedule room cleanup with delay
   */
  scheduleRoomCleanup(roomId, delayMs = 5000) {
    setTimeout(() => {
      const room = gameStateManager.getRoom(roomId);
      if (room) {
        gameStateManager.removeRoom(roomId);
        console.log(`🗑️ Cleaned up room ${roomId} after disconnect delay`);
      }
    }, delayMs);
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
   * Set connection metadata for tracking
   */
  setConnectionMetadata(playerId, roomId, additionalData = {}) {
    this.connectionMetadata.set(playerId, {
      connectedAt: new Date().toISOString(),
      roomId: roomId,
      lastActivity: Date.now(),
      ...additionalData
    });
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
   * Clean up stale connections based on inactivity
   */
  cleanupStaleConnections(staleThresholdMs = 5 * 60 * 1000) {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [playerId, metadata] of this.connectionMetadata.entries()) {
      if (now - metadata.lastActivity > staleThresholdMs) {
        console.log(`🕒 Cleaning up stale connection for player ${playerId}`);
        this.handlePlayerDisconnect(playerId, metadata.roomId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} stale connections`);
    }
    
    return cleanedCount;
  }

  /**
   * Get connection statistics for monitoring
   */
  getConnectionStats() {
    const players = gameStateManager.getPlayers();
    const rooms = gameStateManager.getGameRooms();
    
    return {
      totalPlayers: players.size,
      totalRooms: rooms.size,
      activeConnections: this.connectionMetadata.size,
      connectionsDetail: Array.from(this.connectionMetadata.entries()).map(([playerId, metadata]) => ({
        playerId,
        roomId: metadata.roomId,
        connectedAt: metadata.connectedAt,
        lastActivity: metadata.lastActivity,
        duration: Date.now() - new Date(metadata.connectedAt).getTime()
      }))
    };
  }

  /**
   * Force disconnect all connections (for shutdown scenarios)
   */
  closeAllConnections() {
    const stats = this.getConnectionStats();
    console.log(`🔌 Closing ${stats.activeConnections} active connections...`);
    
    stats.connectionsDetail.forEach(({ playerId, roomId }) => {
      this.handlePlayerDisconnect(playerId, roomId);
    });
    
    console.log('✅ All connections closed.');
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

  /**
   * Get disconnection statistics for analytics
   */
  getDisconnectionStats() {
    // This could be enhanced to track disconnection patterns
    return {
      connectionMetadataSize: this.connectionMetadata.size,
      totalRooms: gameStateManager.getGameRooms().size,
      totalPlayers: gameStateManager.getPlayers().size
    };
  }
}

// Export singleton instance
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
