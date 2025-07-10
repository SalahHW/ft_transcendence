/**
 * Centralized game state management
 * Handles game rooms, players, and animation status
 */
export class GameStateManager {
  constructor() {
    this.gameRooms = new Map();
    this.players = new Map();
    this.animationStatus = new Map();
  }

  /**
   * Get all game rooms
   */
  getGameRooms() {
    return this.gameRooms;
  }

  /**
   * Get all players
   */
  getPlayers() {
    return this.players;
  }

  /**
   * Get animation status for all rooms
   */
  getAnimationStatus() {
    return this.animationStatus;
  }

  /**
   * Get a specific room by ID
   */
  getRoom(roomId) {
    return this.gameRooms.get(roomId);
  }

  /**
   * Get a specific player by ID
   */
  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  /**
   * Create a new room
   */
  createRoom(roomId, room) {
    this.gameRooms.set(roomId, room);
    return room;
  }

  /**
   * Add a player
   */
  addPlayer(playerId, player) {
    this.players.set(playerId, player);
    return player;
  }

  /**
   * Remove a player
   */
  removePlayer(playerId) {
    return this.players.delete(playerId);
  }

  /**
   * Remove a room
   */
  removeRoom(roomId) {
    // Clean up animation status too
    this.animationStatus.delete(roomId);
    return this.gameRooms.delete(roomId);
  }

  /**
   * Initialize animation status for a room
   */
  initializeAnimationStatus(roomId) {
    if (!this.animationStatus.has(roomId)) {
      this.animationStatus.set(roomId, new Set());
    }
    return this.animationStatus.get(roomId);
  }

  /**
   * Add player to animation status
   */
  addPlayerToAnimationStatus(roomId, playerId) {
    const roomAnimStatus = this.animationStatus.get(roomId);
    if (roomAnimStatus) {
      roomAnimStatus.add(playerId);
      return roomAnimStatus.size;
    }
    return 0;
  }

  /**
   * Clear animation status for a room (useful when players are transferred)
   */
  clearAnimationStatus(roomId) {
    if (this.animationStatus.has(roomId)) {
      this.animationStatus.delete(roomId);
      this.initializeAnimationStatus(roomId); // Re-initialize with empty set
      console.log(`Cleared animation status for room ${roomId}`);
    }
  }

  /**
   * Get animation status for debugging
   */
  getAnimationStatusForRoom(roomId) {
    const roomAnimStatus = this.animationStatus.get(roomId);
    return roomAnimStatus ? Array.from(roomAnimStatus) : [];
  }

  /**
   * Get current game state summary
   */
  getGameState() {
    return {
      gameRooms: this.gameRooms,
      players: this.players,
      animationStatus: this.animationStatus
    };
  }

  /**
   * Set player ready status and return room ID if found
   */
  setPlayerReady(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      player.readyToPlay = true;
      console.log(`Player ${playerId} is now ready to play`);
      
      // Find the room this player is in and return the roomId
      for (const [roomId, room] of this.gameRooms.entries()) {
        if (room.players.some(p => p.id === playerId)) {
          return roomId;
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Clean up disconnected players from rooms
   */
  cleanupDisconnectedPlayers() {
    this.gameRooms.forEach((room, roomId) => {
      if (room.players) {
        room.players = room.players.filter(player => 
          player.ws && player.ws.readyState === 1
        );
      }
    });
  }
}

// Create singleton instance
export const gameStateManager = new GameStateManager(); 