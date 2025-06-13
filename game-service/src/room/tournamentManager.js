import { roomManager } from './RoomManager.js';

/**
 * Handles tournament-specific room management and matchmaking
 */
export class TournamentManager {
  constructor() {
    this.roomManager = roomManager;
  }

  /**
   * Find a suitable tournament room for a tournament player
   * @param {Object} player - The tournament player
   * @param {Object} preferences - Player preferences
   * @returns {Object|null} - Tournament room or null if none found
   */
  findSuitableTournamentRoom(player, preferences = {}) {
    console.log(`🏆 Tournament player ${player.id} - Looking for tournament room...`);
    
    const availableRooms = this.roomManager.getAvailableRooms();
    
    // Find tournament rooms that have space (less than 4 players)
    const tournamentRooms = availableRooms.filter(room => {
      // Must be a tournament room
      if (!room.metadata?.isTournament) {
        return false;
      }
      
      // Must have less than 4 players
      if (room.players.length >= 4) {
        return false;
      }
      
      // All players in room must be tournament players
      const hasNonTournamentPlayers = room.players.some(p => !p.tournament);
      if (hasNonTournamentPlayers) {
        return false;
      }
      
      return true;
    });
    
    if (tournamentRooms.length > 0) {
      // Sort by player count (prefer rooms with more players)
      tournamentRooms.sort((a, b) => b.players.length - a.players.length);
      console.log(`🏆 Found tournament room ${tournamentRooms[0].id} with ${tournamentRooms[0].players.length}/4 players`);
      return tournamentRooms[0];
    }
    
    console.log(`🏆 No suitable tournament room found, will create new one`);
    return null;
  }

  /**
   * Create a new tournament room for tournament players
   * @param {Object} player - The tournament player who triggered room creation
   * @param {Object} preferences - Player preferences
   * @returns {Object} - Newly created tournament room
   */
  createTournamentRoom(player, preferences = {}) {
    console.log(`🏆 Creating new tournament room for player ${player.id}`);
    
    const room = this.roomManager.createRoom(null, {
      maxPlayers: 4,
      gameMode: 'tournament',
      metadata: {
        isTournament: true,
        createdBy: player.id,
        tournamentType: 'elimination',
        createdAt: new Date().toISOString(),
        preferences
      }
    });
    
    console.log(`🏆 Tournament room ${room.id} created successfully`);
    return room;
  }

  /**
   * Handle tournament player room assignment
   * @param {Object} player - The tournament player
   * @param {Object} preferences - Player preferences
   * @returns {Object} - Room assignment result { room, roomId, role }
   */
  handleTournamentPlayer(player, preferences = {}) {
    // Try to find existing tournament room
    let room = this.findSuitableTournamentRoom(player, preferences);
    
    // If no suitable room found, create a new one
    if (!room) {
      room = this.createTournamentRoom(player, preferences);
    }
    
    // Add player to room
    const role = room.addPlayer(player);
    
    console.log(`🏆 Tournament player ${player.id} assigned to room ${room.id} as role ${role} (${room.players.length}/4 players)`);
    
    return {
      room,
      roomId: room.id,
      role
    };
  }

  /**
   * Check if a room is a tournament room
   * @param {Object} room - The room to check
   * @returns {boolean} - True if tournament room
   */
  isTournamentRoom(room) {
    return room.metadata?.isTournament === true;
  }

  /**
   * Get tournament room statistics
   * @returns {Object} - Tournament room stats
   */
  getTournamentStats() {
    const allRooms = this.roomManager.getAllRooms();
    const tournamentRooms = allRooms.filter(room => this.isTournamentRoom(room));
    
    const stats = {
      totalTournamentRooms: tournamentRooms.length,
      activeTournamentRooms: tournamentRooms.filter(room => !room.isGameOver).length,
      tournamentPlayersWaiting: 0,
      fullTournamentRooms: 0
    };
    
    tournamentRooms.forEach(room => {
      if (room.players.length === 4) {
        stats.fullTournamentRooms++;
      } else {
        stats.tournamentPlayersWaiting += room.players.length;
      }
    });
    
    return stats;
  }
}

// Create singleton instance
export const tournamentManager = new TournamentManager(); 