import { roomManager } from './RoomManager.js';

/**
 * Handles matchmaking logic for finding or creating rooms
 */
export class RoomMatchmaker {
  constructor() {
    this.roomManager = roomManager;
  }

  /**
   * Find or create a room for a player
   */
  findOrCreateRoom(player, preferences = {}) {
    console.log(`**** Player ${player.id} (${player.username || 'Anonymous'}) - Joining 1v1 game`);
    
    // Regular 1v1 player logic
    let room = this._findSuitableRoom(player, preferences);
    
    if (!room) {
      // No suitable room found, create a new regular 1v1 room
      room = this.roomManager.createRoom(null, {
        maxPlayers: preferences.maxPlayers || 2,
        matchType: '1v1',
        gameMode: preferences.gameMode || 'classic',
        metadata: {
          createdBy: player.id,
          preferences
        }
      });
    }

    // Add player to room
    const role = room.addPlayer(player);
    
    console.log(`Player ${player.id} assigned to room ${room.id} as role ${role}`);
    return {
      room,
      roomId: room.id,
      role
    };
  }

  /**
   * Find a suitable existing room for a regular 1v1 player
   */
  _findSuitableRoom(player, preferences) {
    // Get only 1v1 rooms to prevent cross-contamination
    const availableRooms = this.roomManager.getAvailableRooms('1v1');
    
    // Filter rooms for 1v1 players
    const suitableRooms = availableRooms.filter(room => {
      // Check max players preference
      if (preferences.maxPlayers && room.maxPlayers !== preferences.maxPlayers) {
        return false;
      }
      
      // Check game mode preference
      if (preferences.gameMode && room.metadata?.gameMode !== preferences.gameMode) {
        return false;
      }

      return true;
    });

    // Sort by preference (e.g., by player count, creation time)
    suitableRooms.sort((a, b) => {
      // Prefer rooms with more players (closer to full)
      const playerCountDiff = b.players.length - a.players.length;
      if (playerCountDiff !== 0) return playerCountDiff;
      
      // Then prefer newer rooms
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return suitableRooms[0] || null;
  }
}

// Create singleton instance
export const roomMatchmaker = new RoomMatchmaker(); 