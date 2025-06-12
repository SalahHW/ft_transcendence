import { gameStateManager } from '../game/GameStateManager.js';
import { gameEngine } from '../game/GameEngine.js';
import { reportMatchResultsToAPI } from '../server/api.js';
import { LogUtils, TimeUtils } from '../utils/helpers.js';
import { playerManager } from '../player/PlayerManager.js';

/**
 * Manages player connections and disconnections
 */
export class ConnectionManager {
  constructor() {
    // Track connection metadata
    this.connectionMetadata = new Map();
  }

  /**
   * Handle new player connection
   */
  handlePlayerConnection(ws, playerId, roomId) {
    const player = this._getOrCreatePlayer(ws, playerId);
    const assignedRoomId = roomId || gameEngine.createOrJoinRoom(playerId, player, ws);

    // Set connection metadata
    this._setConnectionMetadata(ws, playerId, assignedRoomId);
    
    LogUtils.logPlayerAction('connected', playerId, assignedRoomId);
    console.log(`Player connected: ${playerId} in room ${assignedRoomId}, total rooms: ${gameStateManager.getGameState().gameRooms.size}`);

    return assignedRoomId;
  }

  /**
   * Handle player disconnection
   */
  handlePlayerDisconnect(playerId, roomId) {
    const player = gameStateManager.getPlayer(playerId);
    const isExplicitLeave = player?.isLeaving === true;
    
    console.log(`🔥 DISCONNECT HANDLER: Player ${playerId} from room ${roomId} ${isExplicitLeave ? '(EXPLICIT LEAVE)' : '(UNEXPECTED DISCONNECT)'}`);
    
    this._cleanupPlayerConnection(playerId);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) return;

    // Check if the game was in progress and award win to remaining player
    if (room.ready && !room.isGameOver && room.players.length === 2) {
      this._handleGameInProgressDisconnect(playerId, roomId, isExplicitLeave);
    } else {
      this._handleRegularDisconnect(playerId, roomId);
    }
  }

  /**
   * Get or create player
   */
  _getOrCreatePlayer(ws, playerId) {
    return playerManager.getOrCreatePlayer(playerId, ws);
  }

  /**
   * Set WebSocket connection metadata
   */
  _setConnectionMetadata(ws, playerId, roomId) {
    try {
      ws.playerId = playerId;
      ws.roomId = roomId;
      
      this.connectionMetadata.set(playerId, {
        connectedAt: new Date().toISOString(),
        roomId: roomId,
        lastActivity: Date.now()
      });
    } catch (e) {
      console.error(`Failed to set ws metadata for player ${playerId}:`, e);
    }
  }

  /**
   * Clean up player connection
   */
  _cleanupPlayerConnection(playerId) {
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
    
    gameStateManager.removePlayer(playerId);
    this.connectionMetadata.delete(playerId);
  }

  /**
   * Handle disconnect during active game
   */
  _handleGameInProgressDisconnect(playerId, roomId, isExplicitLeave) {
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (remainingPlayer && disconnectedPlayer) {
      const actionText = isExplicitLeave ? 'left the game' : 'disconnected during active game';
      console.log(`Player ${playerId} ${actionText}. Awarding win to ${remainingPlayer.id}`);
      
      // Mark game as over
      room.isGameOver = true;
      
      // Create match end data
      const matchData = this._createForfeitMatchData(
        room, 
        roomId, 
        remainingPlayer, 
        disconnectedPlayer, 
        actionText
      );

      // Log forfeit
      LogUtils.logMatchCompletion(matchData);
      
      // Report to external services
      reportMatchResultsToAPI(matchData).catch(err => {
        console.error('Failed to report forfeit results:', err.message);
      });
      
      // Notify remaining player
      gameEngine.broadcastToRoom(roomId, {
        type: 'gameEnd',
        ...matchData,
        reason: 'opponent_disconnect'
      });
      
      // Clean up room after a delay
      setTimeout(() => {
        gameStateManager.removeRoom(roomId);
        console.log(`Cleaned up room ${roomId} after forfeit`);
      }, 5000);
    }
  }

  /**
   * Handle regular disconnect (not during game)
   */
  _handleRegularDisconnect(playerId, roomId) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) return;

    // Remove player from room
    room.players = room.players.filter(p => p.id !== playerId);
    
    // Clean up empty rooms
    if (room.players.length === 0) {
      gameStateManager.removeRoom(roomId);
      console.log(`Removed empty room ${roomId}`);
    } else {
      // Notify remaining players
      gameEngine.broadcastToRoom(roomId, {
        type: 'playerDisconnected',
        playerId,
        remainingPlayers: room.players.length
      });
    }
  }

  /**
   * Create match data for forfeit scenarios
   */
  _createForfeitMatchData(room, roomId, winner, loser, reason) {
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
      matchType: 'forfeit',
      serverTime: Date.now(),
    };
  }

  /**
   * Get connection statistics
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
   * Clean up stale connections
   */
  cleanupStaleConnections() {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [playerId, metadata] of this.connectionMetadata.entries()) {
      if (now - metadata.lastActivity > staleThreshold) {
        console.log(`Cleaning up stale connection for player ${playerId}`);
        this.handlePlayerDisconnect(playerId, metadata.roomId);
      }
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
}

// Create singleton instance
export const connectionManager = new ConnectionManager(); 