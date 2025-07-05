/**
 * Tournament Manager
 * Handles tournament room creation, player management, and tournament flow
 */

import { gameStateManager } from '../game/GameStateManager.js';
import { roomManager } from '../room/RoomManager.js';
import { LogUtils } from '../utils/helpers.js';

/**
 * Tournament phases
 */
export const TournamentPhases = {
  WAITING: 'waiting',
  SEMI_FINALS: 'semi_finals',
  WINNER_FINAL: 'winner_final',
  LOSER_FINAL: 'loser_final',
  FINISHED: 'finished'
};

/**
 * Tournament room types
 */
export const TournamentRoomTypes = {
  WAITING: 'waiting',
  SEMI_FINAL_A: 'semi_final_a',
  SEMI_FINAL_B: 'semi_final_b',
  WINNER_FINAL: 'winner_final',
  LOSER_FINAL: 'loser_final'
};

/**
 * Tournament Manager
 */
export class TournamentManager {
  constructor() {
    this.tournaments = new Map(); // tournamentId -> tournament data
    this.waitingRooms = new Map(); // waitingRoomId -> waiting room data
    this.inactivityTimeouts = new Map(); // waitingRoomId -> timeout reference
    
    // Start periodic cleanup of inactive players
    this.startInactivityCleanup();
  }

  /**
   * Add player to tournament waiting room
   */
  async addPlayerToTournament(playerId, username) {
    console.log(`🏆 Adding player ${username} (${playerId}) to tournament waiting room`);
    
    // Check if this username is already in any waiting room
    const existingPlayer = this.findPlayerByUsername(username);
    if (existingPlayer) {
      console.log(`🏆 Player ${username} already exists in waiting room ${existingPlayer.waitingRoomId}. Removing old player.`);
      console.log(`🏆 Old player ID: ${existingPlayer.playerId}, New player ID: ${playerId}`);
      
      // Remove the old player from the waiting room
      this.handlePlayerDisconnect(existingPlayer.playerId, existingPlayer.waitingRoomId);
      
      // Wait a moment for the cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if the waiting room still exists after cleanup
      if (!this.waitingRooms.has(existingPlayer.waitingRoomId)) {
        console.log(`🏆 Waiting room ${existingPlayer.waitingRoomId} was cleaned up, will create new one or find available`);
      }
    }
    
    // Find existing waiting room or create new one
    let waitingRoom = this.findAvailableWaitingRoom();
    
    if (!waitingRoom) {
      waitingRoom = this.createTournamentWaitingRoom();
      console.log(`🏆 Created new tournament waiting room: ${waitingRoom.id}`);
    }
    
    // DEBUG: Log room state before adding player
    console.log(`🏆 DEBUG: Room ${waitingRoom.id} has ${waitingRoom.players.length} players before adding ${username}`);
    
    // Add player to waiting room
    const player = gameStateManager.getPlayer(playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found in game state`);
    }
    
    // Add player to waiting room (WebSocket connection will be established separately)
    waitingRoom.addPlayer(player);
    
    // Update waiting room data
    const waitingRoomData = this.waitingRooms.get(waitingRoom.id);
    waitingRoomData.players.push({
      id: playerId,
      username: username,
      joinedAt: Date.now(),
      lastActivity: Date.now()
    });
    
    // DEBUG: Log both tracking systems
    console.log(`🏆 DEBUG: Room.players.length = ${waitingRoom.players.length}, waitingRoomData.players.length = ${waitingRoomData.players.length}`);
    console.log(`🏆 DEBUG: Room players: [${waitingRoom.players.map(p => p.username).join(', ')}]`);
    console.log(`🏆 DEBUG: Manager players: [${waitingRoomData.players.map(p => p.username).join(', ')}]`);
    
    console.log(`🏆 Player ${username} added to waiting room ${waitingRoom.id} (${waitingRoom.players.length}/4)`);
    
    // Check if waiting room is full
    if (waitingRoom.players.length === 4) {
      console.log(`🏆 Waiting room ${waitingRoom.id} is full! Starting tournament...`);
      this.startTournament(waitingRoom.id);
    } else {
      console.log(`🏆 Waiting room ${waitingRoom.id} needs ${4 - waitingRoom.players.length} more players to start`);
    }
    
    return {
      waitingRoomId: waitingRoom.id,
      playerCount: waitingRoom.players.length,
      maxPlayers: 4
    };
  }

  /**
   * Remove player from tournament waiting room (explicit leave)
   */
  removePlayerFromTournament(playerId, username) {
    console.log(`🏆 Player ${username} (${playerId}) explicitly leaving tournament waiting room`);
    
    // Find which waiting room the player is in
    for (const [waitingRoomId, waitingRoomData] of this.waitingRooms) {
      const playerIndex = waitingRoomData.players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        // Found the player, remove them
        this.handleWaitingRoomDisconnect(playerId, waitingRoomId);
        return {
          success: true,
          waitingRoomId,
          message: `Player ${username} removed from tournament waiting room`
        };
      }
    }
    
    // Player not found in any waiting room
    console.log(`🏆 Player ${username} (${playerId}) not found in any tournament waiting room`);
    return {
      success: false,
      message: `Player ${username} not found in any tournament waiting room`
    };
  }

  /**
   * Find available waiting room
   */
  findAvailableWaitingRoom() {
    console.log(`🏆 DEBUG: Searching for available waiting room. Total waiting rooms: ${this.waitingRooms.size}`);
    
    for (const [waitingRoomId, waitingRoomData] of this.waitingRooms) {
      const room = gameStateManager.getRoom(waitingRoomId);
      console.log(`🏆 DEBUG: Checking room ${waitingRoomId}: room exists=${!!room}, room.players.length=${room?.players.length}, room.isGameOver=${room?.isGameOver}`);
      
      if (room && room.players.length < 4 && !room.isGameOver) {
        console.log(`🏆 DEBUG: Found available room ${waitingRoomId} with ${room.players.length} players`);
        return room;
      }
    }
    
    console.log(`🏆 DEBUG: No available waiting room found, will create new one`);
    return null;
  }

  /**
   * Create new tournament waiting room with all related rooms
   */
  createTournamentWaitingRoom() {
    // Create waiting room
    const waitingRoomId = this.generateTournamentId();
    const waitingRoom = roomManager.createRoom(waitingRoomId, {
      maxPlayers: 4,
      matchType: 'tournament',
      metadata: {
        tournamentPhase: TournamentPhases.WAITING,
        roomType: TournamentRoomTypes.WAITING,
        createdAt: Date.now()
      }
    });
    
    // Create all tournament rooms upfront
    const tournamentRooms = this.createTournamentRooms(waitingRoomId);
    
    // Store waiting room data
    this.waitingRooms.set(waitingRoomId, {
      id: waitingRoomId,
      players: [],
      tournamentRooms: tournamentRooms,
      createdAt: Date.now(),
      phase: TournamentPhases.WAITING
    });
    
    console.log(`🏆 Created tournament rooms for ${waitingRoomId}:`, Object.keys(tournamentRooms));
    
    return waitingRoom;
  }

  /**
   * Create all tournament rooms for a given waiting room
   */
  createTournamentRooms(waitingRoomId) {
    const rooms = {};
    
    // Semi-final rooms
    rooms.semiFinalA = roomManager.createRoom(`${waitingRoomId}SA`, {
      maxPlayers: 2,
      matchType: 'tournament',
      metadata: {
        tournamentPhase: TournamentPhases.SEMI_FINALS,
        roomType: TournamentRoomTypes.SEMI_FINAL_A,
        waitingRoomId: waitingRoomId,
        createdAt: Date.now()
      }
    });
    
    rooms.semiFinalB = roomManager.createRoom(`${waitingRoomId}SB`, {
      maxPlayers: 2,
      matchType: 'tournament',
      metadata: {
        tournamentPhase: TournamentPhases.SEMI_FINALS,
        roomType: TournamentRoomTypes.SEMI_FINAL_B,
        waitingRoomId: waitingRoomId,
        createdAt: Date.now()
      }
    });
    
    // Final rooms
    rooms.winnerFinal = roomManager.createRoom(`${waitingRoomId}winFin`, {
      maxPlayers: 2,
      matchType: 'tournament',
      metadata: {
        tournamentPhase: TournamentPhases.WINNER_FINAL,
        roomType: TournamentRoomTypes.WINNER_FINAL,
        waitingRoomId: waitingRoomId,
        createdAt: Date.now()
      }
    });
    
    rooms.loserFinal = roomManager.createRoom(`${waitingRoomId}winLos`, {
      maxPlayers: 2,
      matchType: 'tournament',
      metadata: {
        tournamentPhase: TournamentPhases.LOSER_FINAL,
        roomType: TournamentRoomTypes.LOSER_FINAL,
        waitingRoomId: waitingRoomId,
        createdAt: Date.now()
      }
    });
    
    return rooms;
  }

  /**
   * Start tournament when waiting room is full
   */
  startTournament(waitingRoomId) {
    console.log(`🏆 Starting tournament for waiting room ${waitingRoomId}`);
    
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) {
      console.error(`Waiting room data not found for ${waitingRoomId}`);
      return;
    }
    
    const waitingRoom = gameStateManager.getRoom(waitingRoomId);
    if (!waitingRoom || waitingRoom.players.length !== 4) {
      console.error(`Invalid waiting room state for ${waitingRoomId}`);
      return;
    }
    
    // Assign players to semi-final rooms
    const players = waitingRoom.players;
    
    // Semi-final A: players 0 and 1
    const semiFinalA = waitingRoomData.tournamentRooms.semiFinalA;
    semiFinalA.addPlayer(players[0]);
    semiFinalA.addPlayer(players[1]);
    
    // Semi-final B: players 2 and 3
    const semiFinalB = waitingRoomData.tournamentRooms.semiFinalB;
    semiFinalB.addPlayer(players[2]);
    semiFinalB.addPlayer(players[3]);
    
    // Update tournament phase
    waitingRoomData.phase = TournamentPhases.SEMI_FINALS;
    
    console.log(`🏆 Tournament started: ${players[0].username} vs ${players[1].username} in Semi-Final A`);
    console.log(`🏆 Tournament started: ${players[2].username} vs ${players[3].username} in Semi-Final B`);
    
    // Mark waiting room as over
    waitingRoom.isGameOver = true;
  }

  /**
   * Handle player disconnection from tournament
   */
  handlePlayerDisconnect(playerId, roomId) {
    console.log(`🏆 Handling tournament disconnect: player ${playerId} from room ${roomId}`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.error(`Room ${roomId} not found for tournament disconnect`);
      return;
    }
    
    // Check if this is a waiting room
    if (room.metadata?.roomType === TournamentRoomTypes.WAITING) {
      this.handleWaitingRoomDisconnect(playerId, roomId);
    } else {
      // Handle other tournament room disconnections
      this.handleTournamentRoomDisconnect(playerId, roomId);
    }
  }

  /**
   * Handle disconnection from waiting room
   */
  handleWaitingRoomDisconnect(playerId, roomId) {
    console.log(`🏆 Handling waiting room disconnect: player ${playerId} from room ${roomId}`);
    
    const waitingRoomData = this.waitingRooms.get(roomId);
    if (!waitingRoomData) {
      console.error(`Waiting room data not found for ${roomId}`);
      return;
    }
    
    // Find the player being removed for logging
    const removedPlayer = waitingRoomData.players.find(p => p.id === playerId);
    const playerUsername = removedPlayer?.username || playerId;
    
    // Remove player from waiting room data
    waitingRoomData.players = waitingRoomData.players.filter(p => p.id !== playerId);
    
    const room = gameStateManager.getRoom(roomId);
    if (room) {
      // Remove player from room
      room.removePlayer(playerId);
      
      console.log(`🏆 Player ${playerUsername} removed from waiting room ${roomId} (${room.players.length}/4)`);
      
      // If waiting room is empty, clean up all tournament rooms
      if (room.players.length === 0) {
        console.log(`🏆 Waiting room ${roomId} is empty, cleaning up tournament rooms`);
        this.cleanupTournamentRooms(roomId);
      } else if (room.players.length < 4) {
        // If we had 4 players and now have fewer, log that tournament won't start
        console.log(`🏆 Tournament ${roomId} cannot start: only ${room.players.length}/4 players remaining`);
        console.log(`🏆 Remaining players: [${room.players.map(p => p.username || p.id).join(', ')}]`);
      }
    }
  }

  /**
   * Handle disconnection from tournament room (semi-finals, finals)
   */
  handleTournamentRoomDisconnect(playerId, roomId) {
    console.log(`🏆 Handling tournament room disconnect: player ${playerId} from room ${roomId}`);
    
    // Find the waiting room this tournament room belongs to
    const room = gameStateManager.getRoom(roomId);
    if (!room || !room.metadata?.waitingRoomId) {
      console.error(`Tournament room ${roomId} has no waiting room reference`);
      return;
    }
    
    const waitingRoomId = room.metadata.waitingRoomId;
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    
    if (!waitingRoomData) {
      console.error(`Waiting room data not found for tournament room ${roomId}`);
      return;
    }
    
    // Handle based on room type
    switch (room.metadata.roomType) {
      case TournamentRoomTypes.SEMI_FINAL_A:
      case TournamentRoomTypes.SEMI_FINAL_B:
        this.handleSemiFinalDisconnect(playerId, roomId, waitingRoomId);
        break;
      case TournamentRoomTypes.WINNER_FINAL:
      case TournamentRoomTypes.LOSER_FINAL:
        this.handleFinalDisconnect(playerId, roomId, waitingRoomId);
        break;
      default:
        console.error(`Unknown tournament room type: ${room.metadata.roomType}`);
    }
  }

  /**
   * Handle semi-final disconnection
   */
  handleSemiFinalDisconnect(playerId, roomId, waitingRoomId) {
    console.log(`🏆 Handling semi-final disconnect: player ${playerId} from room ${roomId}`);
    
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    
    if (remainingPlayer) {
      // Award forfeit win to remaining player
      console.log(`🏆 Awarding forfeit win to ${remainingPlayer.username} in semi-final ${roomId}`);
      
      // TODO: Implement tournament progression logic
      // For now, just log the forfeit
      LogUtils.logMatchCompletion({
        roomId,
        matchType: 'tournament_semi_final',
        winner: { id: remainingPlayer.id, username: remainingPlayer.username },
        loser: { id: playerId, username: 'Disconnected Player' },
        forfeitReason: 'Player disconnected during semi-final'
      });
    }
  }

  /**
   * Handle final disconnection
   */
  handleFinalDisconnect(playerId, roomId, waitingRoomId) {
    console.log(`🏆 Handling final disconnect: player ${playerId} from room ${roomId}`);
    
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    
    if (remainingPlayer) {
      // Award forfeit win to remaining player
      console.log(`🏆 Awarding forfeit win to ${remainingPlayer.username} in final ${roomId}`);
      
      // TODO: Implement tournament completion logic
      // For now, just log the forfeit
      LogUtils.logMatchCompletion({
        roomId,
        matchType: 'tournament_final',
        winner: { id: remainingPlayer.id, username: remainingPlayer.username },
        loser: { id: playerId, username: 'Disconnected Player' },
        forfeitReason: 'Player disconnected during final'
      });
    }
  }

  /**
   * Clean up all tournament rooms
   */
  cleanupTournamentRooms(waitingRoomId) {
    console.log(`🏆 Cleaning up all tournament rooms for waiting room ${waitingRoomId}`);
    
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) {
      console.error(`Waiting room data not found for cleanup: ${waitingRoomId}`);
      return;
    }
    
    // Remove all tournament rooms
    const roomIds = [
      waitingRoomId,
      `${waitingRoomId}SA`,
      `${waitingRoomId}SB`,
      `${waitingRoomId}winFin`,
      `${waitingRoomId}winLos`
    ];
    
    roomIds.forEach(roomId => {
      gameStateManager.removeRoom(roomId);
      console.log(`🏆 Removed tournament room: ${roomId}`);
    });
    
    // Remove waiting room data
    this.waitingRooms.delete(waitingRoomId);
    
    console.log(`🏆 Tournament cleanup completed for ${waitingRoomId}`);
  }

  /**
   * Generate unique tournament ID
   */
  generateTournamentId() {
    return `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get tournament statistics
   */
  getTournamentStats() {
    return {
      activeWaitingRooms: this.waitingRooms.size,
      totalTournaments: this.tournaments.size,
      waitingRoomsDetail: Array.from(this.waitingRooms.entries()).map(([id, data]) => ({
        id,
        playerCount: data.players.length,
        phase: data.phase,
        createdAt: data.createdAt
      }))
    };
  }

  /**
   * Get current player count for a specific waiting room
   */
  getWaitingRoomPlayerCount(waitingRoomId) {
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) {
      return null;
    }
    
    return {
      waitingRoomId,
      playerCount: waitingRoomData.players.length,
      maxPlayers: 4,
      players: waitingRoomData.players.map(p => ({
        id: p.id,
        username: p.username,
        joinedAt: p.joinedAt
      }))
    };
  }

  /**
   * Get all waiting room player counts
   */
  getAllWaitingRoomCounts() {
    const counts = {};
    for (const [waitingRoomId, data] of this.waitingRooms) {
      counts[waitingRoomId] = {
        playerCount: data.players.length,
        maxPlayers: 4,
        players: data.players.map(p => ({
          id: p.id,
          username: p.username,
          joinedAt: p.joinedAt
        }))
      };
    }
    return counts;
  }

  /**
   * Start periodic cleanup of inactive players in waiting rooms
   */
  startInactivityCleanup() {
    setInterval(() => {
      this.cleanupInactivePlayers();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Clean up inactive players from waiting rooms
   */
  cleanupInactivePlayers() {
    const now = Date.now();
    const inactivityThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [waitingRoomId, waitingRoomData] of this.waitingRooms) {
      // Check for inactive players
      const inactivePlayers = waitingRoomData.players.filter(player => {
        const timeSinceJoin = now - player.joinedAt;
        return timeSinceJoin > inactivityThreshold;
      });
      
      if (inactivePlayers.length > 0) {
        console.log(`🏆 Cleaning up ${inactivePlayers.length} inactive players from waiting room ${waitingRoomId}`);
        
        inactivePlayers.forEach(player => {
          console.log(`🏆 Removing inactive player ${player.username} (${player.id}) from waiting room ${waitingRoomId}`);
          this.handlePlayerDisconnect(player.id, waitingRoomId);
        });
      }
      
      // Check for duplicate usernames in the same waiting room
      const usernameCounts = {};
      waitingRoomData.players.forEach(player => {
        usernameCounts[player.username] = (usernameCounts[player.username] || 0) + 1;
      });
      
      const duplicateUsernames = Object.keys(usernameCounts).filter(username => usernameCounts[username] > 1);
      
      if (duplicateUsernames.length > 0) {
        console.log(`🏆 Found duplicate usernames in waiting room ${waitingRoomId}: ${duplicateUsernames.join(', ')}`);
        
        duplicateUsernames.forEach(username => {
          const duplicatePlayers = waitingRoomData.players.filter(p => p.username === username);
          // Keep the most recent player, remove the older ones
          const sortedPlayers = duplicatePlayers.sort((a, b) => b.joinedAt - a.joinedAt);
          const playersToRemove = sortedPlayers.slice(1); // Remove all but the most recent
          
          playersToRemove.forEach(player => {
            console.log(`🏆 Removing duplicate player ${player.username} (${player.id}) from waiting room ${waitingRoomId}`);
            this.handlePlayerDisconnect(player.id, waitingRoomId);
          });
        });
      }
    }
  }

  /**
   * Find player by username across all waiting rooms
   */
  findPlayerByUsername(username) {
    for (const [waitingRoomId, waitingRoomData] of this.waitingRooms) {
      const player = waitingRoomData.players.find(p => p.username === username);
      if (player) {
        return {
          playerId: player.id,
          username: player.username,
          waitingRoomId: waitingRoomId,
          joinedAt: player.joinedAt
        };
      }
    }
    return null;
  }

  /**
   * Update player activity timestamp
   */
  updatePlayerActivity(playerId, waitingRoomId) {
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    if (waitingRoomData) {
      const player = waitingRoomData.players.find(p => p.id === playerId);
      if (player) {
        player.lastActivity = Date.now();
        console.log(`🏆 Updated activity for player ${player.username} in waiting room ${waitingRoomId}`);
      }
    }
  }

  /**
   * Handle tournament player WebSocket connection established
   */
  handlePlayerWebSocketConnected(playerId, waitingRoomId) {
    console.log(`🏆 Tournament player ${playerId} WebSocket connected to waiting room ${waitingRoomId}`);
    
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    if (waitingRoomData) {
      const player = waitingRoomData.players.find(p => p.id === playerId);
      if (player) {
        player.lastActivity = Date.now();
        player.hasWebSocket = true;
        console.log(`🏆 Marked player ${player.username} as WebSocket connected in waiting room ${waitingRoomId}`);
      }
    }
  }

  /**
   * Send waiting room status to all connected players
   */
  broadcastWaitingRoomStatus(waitingRoomId) {
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) return;
    
    const room = gameStateManager.getRoom(waitingRoomId);
    if (!room) return;
    
    const message = {
      type: 'tournamentWaitingRoomStatus',
      roomId: waitingRoomId,
      playerCount: room.players.length,
      maxPlayers: 4,
      players: room.players.map(p => ({
        id: p.id,
        username: p.username,
        hasWebSocket: p.ws && p.ws.readyState === 1
      }))
    };
    
    // Send to all players with WebSocket connections
    room.players.forEach(player => {
      if (player.ws && player.ws.readyState === 1) {
        try {
          player.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to send waiting room status to player ${player.id}:`, error);
        }
      }
    });
  }

  /**
   * Handle player leaving tournament (explicit leave button)
   */
  handlePlayerLeave(playerId, waitingRoomId) {
    console.log(`🏆 Player ${playerId} explicitly leaving tournament waiting room ${waitingRoomId}`);
    
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) {
      console.log(`🏆 Waiting room ${waitingRoomId} not found, player may have already left`);
      return;
    }
    
    // Remove player from waiting room
    const playerIndex = waitingRoomData.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      const player = waitingRoomData.players[playerIndex];
      waitingRoomData.players.splice(playerIndex, 1);
      console.log(`🏆 Removed player ${player.username} from waiting room ${waitingRoomId}`);
      
      // Remove player from room
      const room = gameStateManager.getRoom(waitingRoomId);
      if (room) {
        const roomPlayerIndex = room.players.findIndex(p => p.id === playerId);
        if (roomPlayerIndex !== -1) {
          room.players.splice(roomPlayerIndex, 1);
          console.log(`🏆 Removed player ${player.username} from room ${waitingRoomId}`);
        }
      }
      
      // Notify remaining players
      this.broadcastWaitingRoomStatus(waitingRoomId);
      
      // Check if waiting room is now empty
      if (waitingRoomData.players.length === 0) {
        console.log(`🏆 Waiting room ${waitingRoomId} is now empty, cleaning up`);
        this.cleanupWaitingRoom(waitingRoomId);
      }
    }
  }
}

// Export singleton instance
export const tournamentManager = new TournamentManager(); 