import { Room } from './Room.js';
import { gameStateManager } from '../game/GameStateManager.js';

/**
 * Manages room lifecycle and operations
 */
export class RoomManager {
  constructor() {
    this.stateManager = gameStateManager;
    this._roomCounter = 0; // Counter for collision prevention
  }

  /**
   * Create a new room
   */
  createRoom(roomId = null, options = {}) {
    const id = roomId || this._generateRoomId();
    const room = new Room(id, options);
    
    this.stateManager.createRoom(id, room);
    console.log(`Created room ${id}`);
    
    return room;
  }

  /**
   * Get room by ID
   */
  getRoom(roomId) {
    return this.stateManager.getRoom(roomId);
  }

  /**
   * Get all rooms
   */
  getAllRooms() {
    return Array.from(this.stateManager.getGameRooms().values());
  }

  /**
   * Remove room
   */
  removeRoom(roomId) {
    const room = this.getRoom(roomId);
    if (room) {
      room.cleanup();
      const removed = this.stateManager.removeRoom(roomId);
      console.log(`Removed room ${roomId}`);
      return removed;
    }
    return false;
  }

  /**
   * Add player to room
   */
  addPlayerToRoom(roomId, player) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    return room.addPlayer(player);
  }

  /**
   * Remove player from room
   */
  removePlayerFromRoom(roomId, playerId) {
    const room = this.getRoom(roomId);
    if (!room) {
      return false;
    }

    const removedPlayer = room.removePlayer(playerId);
    
    // Clean up empty rooms
    if (room.isEmpty() && !room.gameStarted) {
      this.removeRoom(roomId);
    }
    
    return removedPlayer;
  }

  /**
   * Get available rooms (not full, not finished)
   */
  getAvailableRooms() {
    const rooms = this.getAllRooms();
    return rooms.filter(room => 
      !room.isFull() && 
      !room.isGameOver && 
      !room.ready
    );
  }

  /**
   * Get rooms by status
   */
  getRoomsByStatus(status) {
    const rooms = this.getAllRooms();
    return rooms.filter(room => room.getStatus() === status);
  }

  /**
   * Get active game rooms (currently playing)
   */
  getActiveRooms() {
    return this.getRoomsByStatus('playing');
  }

  /**
   * Get waiting rooms (waiting for players)
   */
  getWaitingRooms() {
    return this.getRoomsByStatus('waiting_for_players');
  }

  /**
   * Get finished rooms
   */
  getFinishedRooms() {
    return this.getRoomsByStatus('finished');
  }

  /**
   * Find room with specific player
   */
  findRoomWithPlayer(playerId) {
    const rooms = this.getAllRooms();
    return rooms.find(room => room.getPlayer(playerId));
  }

  /**
   * Get rooms summary for API
   */
  getRoomsSummary() {
    const rooms = this.getAllRooms();
    return rooms.map(room => room.toSummary());
  }

  /**
   * Get room statistics
   */
  getRoomStats() {
    const rooms = this.getAllRooms();
    const statuses = {};
    
    rooms.forEach(room => {
      const status = room.getStatus();
      statuses[status] = (statuses[status] || 0) + 1;
    });

    return {
      total: rooms.length,
      byStatus: statuses,
      averagePlayersPerRoom: rooms.length > 0 ? 
        rooms.reduce((sum, room) => sum + room.players.length, 0) / rooms.length : 0,
      activeGames: statuses.playing || 0,
      waitingRooms: statuses.waiting_for_players || 0
    };
  }

  /**
   * Initialize ball for a room
   */
  initializeRoomBall(roomId) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    return room.initializeBall();
  }

  /**
   * Reset ball for a room
   */
  resetRoomBall(roomId) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    room.resetBall();
    return room.ball;
  }

  /**
   * Set room as ready to start game
   */
  setRoomReady(roomId) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    room.setReady();
    return room;
  }

  /**
   * End game in room
   */
  endRoomGame(roomId, winner = null, loser = null) {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    return room.endGame(winner, loser);
  }

  /**
   * Update room activity
   */
  updateRoomActivity(roomId) {
    const room = this.getRoom(roomId);
    if (room) {
      room.updateActivity();
    }
  }

  /**
   * Cleanup stale rooms
   */
  cleanupStaleRooms(thresholdMs = 10 * 60 * 1000) {
    const rooms = this.getAllRooms();
    const staleRooms = rooms.filter(room => room.isStale(thresholdMs));
    
    staleRooms.forEach(room => {
      console.log(`Cleaning up stale room ${room.id}`);
      this.removeRoom(room.id);
    });

    return staleRooms.length;
  }

  /**
   * Cleanup finished rooms
   */
  cleanupFinishedRooms(olderThanMs = 5 * 60 * 1000) {
    const finishedRooms = this.getFinishedRooms();
    const threshold = Date.now() - olderThanMs;
    
    const roomsToCleanup = finishedRooms.filter(room => 
      new Date(room.createdAt).getTime() < threshold
    );
    
    roomsToCleanup.forEach(room => {
      console.log(`Cleaning up finished room ${room.id}`);
      this.removeRoom(room.id);
    });

    return roomsToCleanup.length;
  }

  /**
   * Clean up disconnected players from all rooms
   */
  cleanupDisconnectedPlayers() {
    const rooms = this.getAllRooms();
    let cleanedPlayersCount = 0;

    console.log(`🧹 Starting cleanup of ${rooms.length} rooms`);

    rooms.forEach(room => {
      console.log(`🧹 Checking room ${room.id}: roomType=${room.metadata?.roomType}, matchType=${room.matchType}, players=${room.players.length}`);
      
      // Skip cleanup for tournament waiting rooms - they are managed by tournament disconnect handler
      if (room.metadata?.roomType === 'waiting' && room.matchType === 'tournament') {
        console.log(`🏆 Skipping cleanup for tournament waiting room ${room.id} (${room.players.length} players)`);
        return;
      }

      const originalCount = room.players.length;
      const disconnectedPlayers = room.players.filter(player => !player.isConnected());
      room.players = room.players.filter(player => player.isConnected());
      cleanedPlayersCount += originalCount - room.players.length;
      
      if (disconnectedPlayers.length > 0) {
        console.log(`🧹 Removed ${disconnectedPlayers.length} disconnected players from room ${room.id}: [${disconnectedPlayers.map(p => p.username || p.id).join(', ')}]`);
      }
      
      // Remove empty rooms
      if (room.isEmpty() && !room.gameStarted) {
        this.removeRoom(room.id);
      }
    });

    console.log(`🧹 Cleanup completed: cleaned up ${cleanedPlayersCount} disconnected players`);
    return cleanedPlayersCount;
  }

  /**
   * Get room capacity overview
   */
  getCapacityOverview() {
    const rooms = this.getAllRooms();
    let totalCapacity = 0;
    let occupiedSlots = 0;

    rooms.forEach(room => {
      totalCapacity += room.maxPlayers;
      occupiedSlots += room.players.length;
    });

    return {
      totalRooms: rooms.length,
      totalCapacity,
      occupiedSlots,
      availableSlots: totalCapacity - occupiedSlots,
      occupancyRate: totalCapacity > 0 ? (occupiedSlots / totalCapacity) * 100 : 0
    };
  }

  /**
   * Search rooms by criteria
   */
  searchRooms(criteria = {}) {
    const rooms = this.getAllRooms();
    
    return rooms.filter(room => {
      if (criteria.status && room.getStatus() !== criteria.status) return false;
      if (criteria.minPlayers && room.players.length < criteria.minPlayers) return false;
      if (criteria.maxPlayers && room.players.length > criteria.maxPlayers) return false;
      if (criteria.hasPlayer && !room.getPlayer(criteria.hasPlayer)) return false;
      if (criteria.gameStarted !== undefined && room.gameStarted !== criteria.gameStarted) return false;
      
      return true;
    });
  }

  /**
   * Get room leaderboard
   */
  getRoomLeaderboard() {
    const finishedRooms = this.getFinishedRooms();
    
    const roomStats = finishedRooms.map(room => ({
      roomId: room.id,
      duration: room.metadata.totalPlayTime,
      players: room.players.map(p => p.username || p.id),
      scores: room.getCurrentScores(),
      scoreHistory: room.matchData.scoreHistory.length
    }));

    return roomStats.sort((a, b) => b.duration - a.duration);
  }

  /**
   * Generate unique room ID
   */
  _generateRoomId() {
    // Use timestamp + counter + random for collision-resistant IDs
    const timestamp = Date.now().toString(36);
    const counter = (this._roomCounter = (this._roomCounter || 0) + 1).toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `room_${timestamp}_${counter}_${random}`;
  }

  /**
   * Export rooms data for backup/debugging
   */
  exportRoomsData() {
    const rooms = this.getAllRooms();
    return {
      timestamp: new Date().toISOString(),
      roomCount: rooms.length,
      stats: this.getRoomStats(),
      capacity: this.getCapacityOverview(),
      rooms: rooms.map(room => room.toDetailedInfo())
    };
  }
}

// Create singleton instance
export const roomManager = new RoomManager(); 