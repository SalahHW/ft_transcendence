import { roomManager } from './RoomManager.js';
import { gameEngine } from '../game/GameEngine.js';

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
    
    // ⭐ CHECK IF ROOM IS FULL: Split into semi-finals when 4 players reached
    if (room.players.length === 4) {
      console.log(`🏆 Tournament room ${room.id} is full! Creating semi-final matches...`);
      this.createSemiFinalMatches(room);
      
      // Find which semi-final room this player was assigned to
      const semiFinalRoomA = this.roomManager.getRoom(room.id + 'A');
      const semiFinalRoomB = this.roomManager.getRoom(room.id + 'B');
      
      if (semiFinalRoomA && semiFinalRoomA.players.some(p => p.id === player.id)) {
        return {
          room: semiFinalRoomA,
          roomId: semiFinalRoomA.id,
          role: semiFinalRoomA.players.findIndex(p => p.id === player.id)
        };
      } else if (semiFinalRoomB && semiFinalRoomB.players.some(p => p.id === player.id)) {
        return {
          room: semiFinalRoomB,
          roomId: semiFinalRoomB.id,
          role: semiFinalRoomB.players.findIndex(p => p.id === player.id)
        };
      }
    }
    
    return {
      room,
      roomId: room.id,
      role
    };
  }

  /**
   * Create semi-final matches when tournament room is full (4 players)
   * @param {Object} waitingRoom - The full tournament waiting room
   */
  createSemiFinalMatches(waitingRoom) {
    const players = [...waitingRoom.players]; // Copy players array
    
    if (players.length !== 4) {
      console.error(`🏆 Cannot create semi-finals: Expected 4 players, got ${players.length}`);
      return;
    }
    
    console.log(`🏆 Splitting tournament room ${waitingRoom.id} into semi-final matches...`);
    
    // Create Semi-Final Room A (first 2 players)
    const roomAId = waitingRoom.id + 'A';
    const semiFinalA = this.roomManager.createRoom(roomAId, {
      maxPlayers: 2,
      gameMode: 'tournament-semifinal',
      metadata: {
        isTournament: true,
        tournamentType: 'semifinal',
        parentRoom: waitingRoom.id,
        semiFinalMatch: 'A',
        createdAt: new Date().toISOString(),
        waitingRoomPlayers: players.map(p => ({ id: p.id, username: p.username }))
      }
    });
    
    // Create Semi-Final Room B (last 2 players)
    const roomBId = waitingRoom.id + 'B';
    const semiFinalB = this.roomManager.createRoom(roomBId, {
      maxPlayers: 2,
      gameMode: 'tournament-semifinal',
      metadata: {
        isTournament: true,
        tournamentType: 'semifinal',
        parentRoom: waitingRoom.id,
        semiFinalMatch: 'B',
        createdAt: new Date().toISOString(),
        waitingRoomPlayers: players.map(p => ({ id: p.id, username: p.username }))
      }
    });
    
    // Assign players to semi-final rooms
    console.log(`🏆 Semi-Final A (${roomAId}): ${players[0].username} vs ${players[1].username}`);
    semiFinalA.addPlayer(players[0]);
    semiFinalA.addPlayer(players[1]);
    
    console.log(`🏆 Semi-Final B (${roomBId}): ${players[2].username} vs ${players[3].username}`);
    semiFinalB.addPlayer(players[2]);
    semiFinalB.addPlayer(players[3]);
    
    // ⭐ CRITICAL: Update player room associations and WebSocket connections
    this._updatePlayerRoomAssociations(players, roomAId, roomBId);
    
    // Remove players from waiting room (clean up)
    waitingRoom.players = [];
    waitingRoom.metadata.status = 'split_into_semifinals';
    waitingRoom.metadata.semiFinalRooms = [roomAId, roomBId];
    
    // ⭐ CRITICAL: Trigger game initialization for both semi-final rooms
    console.log(`🏆 Triggering game initialization for semi-final rooms...`);
    gameEngine.checkRoomReady(roomAId);
    gameEngine.checkRoomReady(roomBId);
    
    console.log(`🏆 Tournament waiting room ${waitingRoom.id} split successfully!`);
    console.log(`🏆 Semi-Final A: ${roomAId} | Semi-Final B: ${roomBId}`);
  }

  /**
   * Update player room associations when moving to semi-final rooms
   * @param {Array} players - Array of 4 players from waiting room
   * @param {string} roomAId - Semi-final room A ID
   * @param {string} roomBId - Semi-final room B ID
   */
  _updatePlayerRoomAssociations(players, roomAId, roomBId) {
    console.log(`🏆 Updating player room associations...`);
    
    // Update players 0 and 1 to room A
    [players[0], players[1]].forEach((player, index) => {
      if (player.ws) {
        player.ws.roomId = roomAId;
        player.roomId = roomAId;
        console.log(`🏆 Player ${player.id} (${player.username}) moved to Semi-Final A: ${roomAId}`);
      }
    });
    
    // Update players 2 and 3 to room B
    [players[2], players[3]].forEach((player, index) => {
      if (player.ws) {
        player.ws.roomId = roomBId;
        player.roomId = roomBId;
        console.log(`🏆 Player ${player.id} (${player.username}) moved to Semi-Final B: ${roomBId}`);
      }
    });
    
    console.log(`🏆 Player room associations updated successfully`);
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
   * Check if a room is a semi-final room
   * @param {Object} room - The room to check
   * @returns {boolean} - True if semi-final room
   */
  isSemiFinalRoom(room) {
    return room.metadata?.tournamentType === 'semifinal';
  }

  /**
   * Get tournament room statistics
   * @returns {Object} - Tournament room stats
   */
  getTournamentStats() {
    const allRooms = this.roomManager.getAllRooms();
    const tournamentRooms = allRooms.filter(room => this.isTournamentRoom(room));
    const semiFinalRooms = tournamentRooms.filter(room => this.isSemiFinalRoom(room));
    const waitingRooms = tournamentRooms.filter(room => !this.isSemiFinalRoom(room));
    
    const stats = {
      totalTournamentRooms: tournamentRooms.length,
      waitingRooms: waitingRooms.length,
      semiFinalRooms: semiFinalRooms.length,
      activeTournamentRooms: tournamentRooms.filter(room => !room.isGameOver).length,
      tournamentPlayersWaiting: 0,
      fullWaitingRooms: 0,
      activeSemiFinals: semiFinalRooms.filter(room => !room.isGameOver).length
    };
    
    waitingRooms.forEach(room => {
      if (room.players.length === 4) {
        stats.fullWaitingRooms++;
      } else {
        stats.tournamentPlayersWaiting += room.players.length;
      }
    });
    
    return stats;
  }
}

// Create singleton instance
export const tournamentManager = new TournamentManager(); 