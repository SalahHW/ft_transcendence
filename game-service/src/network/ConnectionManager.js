import { gameStateManager } from '../game/GameStateManager.js';
import { gameEngine } from '../game/GameEngine.js';
import { disconnectionHandler } from '../server/disconnect/index.js';
import { LogUtils, TimeUtils } from '../utils/helpers.js';
import { playerManager } from '../player/PlayerManager.js';
import { roomManager } from '../room/RoomManager.js';
import { tournamentManager } from '../tournament/TournamentManager.js';

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
    
    // Check if this is a tournament waiting room connection
    const matchType = ws.matchType || '1v1';
    
    if (matchType === 'tournament' && roomId) {
      // This is a tournament waiting room connection
      console.log(`🏆 Tournament waiting room connection: player ${playerId} to room ${roomId}`);
      
      // Verify the room exists and is a tournament waiting room
      const room = gameStateManager.getRoom(roomId);
      console.log(`🏆 DEBUG: Room validation for ${roomId}:`, {
        roomExists: !!room,
        roomMetadata: room?.metadata,
        roomType: room?.metadata?.roomType,
        matchType: room?.matchType,
        expectedRoomType: 'waiting',
        expectedMatchType: 'tournament'
      });
      
      if (room && room.metadata?.roomType === 'waiting' && room.matchType === 'tournament') {
        // Update player's WebSocket connection
        player.updateConnection(ws);
        
        // Set connection metadata
        this._setConnectionMetadata(ws, playerId, roomId);
        
        LogUtils.logPlayerAction('connected', playerId, roomId);
        console.log(`🏆 Tournament player connected: ${playerId} in waiting room ${roomId}`);
        
        // Notify tournament manager of WebSocket connection
        tournamentManager.handlePlayerWebSocketConnected(playerId, roomId);
        
        return roomId;
      } else {
        console.error(`🏆 Invalid tournament waiting room: ${roomId}`);
        return null;
      }
    } else {
      // Regular 1v1 connection
      const assignedRoomId = roomId || gameEngine.createOrJoinRoom(playerId, player, ws);

      // Set connection metadata
      this._setConnectionMetadata(ws, playerId, assignedRoomId);
      
      LogUtils.logPlayerAction('connected', playerId, assignedRoomId);
      console.log(`Player connected: ${playerId} in room ${assignedRoomId}, total rooms: ${gameStateManager.getGameState().gameRooms.size}`);

      return assignedRoomId;
    }
  }

  /**
   * Handle player disconnection (delegated to disconnect module)
   */
  handlePlayerDisconnect(playerId, roomId) {
    // This is now handled by the disconnect detection system
    console.log(`Player disconnect handled by disconnect detection system: ${playerId}`);
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
   * Clean up player connection (delegated to disconnect module)
   */
  _cleanupPlayerConnection(playerId) {
    // This is now handled by the disconnect detection system
    this.connectionMetadata.delete(playerId);
  }

  /**
   * Handle disconnect during active game (delegated to disconnect module)
   */
  _handleGameInProgressDisconnect(playerId, roomId, isExplicitLeave) {
    // This is now handled by the disconnect detection system
  }

  /**
   * Handle regular disconnect (delegated to disconnect module)
   */
  _handleRegularDisconnect(playerId, roomId) {
    // This is now handled by the disconnect detection system
  }

  /**
   * Create match data for forfeit scenarios (delegated to disconnect module)
   */
  _createForfeitMatchData(room, roomId, winner, loser, reason) {
    // This is now handled by the disconnect detection system
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
   * Clean up stale connections (delegated to disconnect module)
   */
  cleanupStaleConnections() {
    // This is now handled by the disconnect detection system
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
   * Send welcome message to tournament waiting room player
   */
  _sendTournamentWelcomeMessage(ws, player, room) {
    try {
      const message = {
        type: 'tournamentWelcome',
        playerId: player.id,
        username: player.username,
        roomId: room.id,
        playerCount: room.players.length,
        maxPlayers: 4,
        message: `Welcome to tournament waiting room! You are player ${room.players.length} of 4.`
      };
      
      ws.send(JSON.stringify(message));
      console.log(`🏆 Sent welcome message to tournament player ${player.username} in room ${room.id}`);
    } catch (error) {
      console.error(`Failed to send tournament welcome message to player ${player.id}:`, error);
    }
  }
}

// Create singleton instance
export const connectionManager = new ConnectionManager(); 