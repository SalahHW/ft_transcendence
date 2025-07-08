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
  async handlePlayerConnection(ws, playerId, roomId) {
    console.log(`🔌 New player connection: ${playerId} to room ${roomId}`);
    
    // Create or get player
    const player = playerManager.getOrCreatePlayer(playerId, ws);
    
    // Assign room
    const assignedRoomId = roomId || await gameEngine.createOrJoinRoom(playerId, player, ws);
    
    // Update player's room assignment
    player.assignToRoom(assignedRoomId);
    
    // Update WebSocket room ID for disconnect handling
    ws.roomId = assignedRoomId;
    
    console.log(`🔌 Player ${playerId} assigned to room ${assignedRoomId}`);
    return assignedRoomId;
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