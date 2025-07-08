/**
 * Tournament Player Manager
 * Handles player operations in tournament waiting rooms
 */

import { gameStateManager } from '../../game/GameStateManager.js';
import { TournamentConfig, TournamentPhases } from '../constants.js';
import { TournamentRoomFactory } from '../rooms/TournamentRoomFactory.js';

export class TournamentPlayerManager {
  constructor(waitingRooms, disconnectHandler) {
    this.waitingRooms = waitingRooms;
    this.disconnectHandler = null; // Will be set dynamically
  }

  /**
   * Get disconnect handler dynamically to avoid circular dependencies
   */
  async getDisconnectHandler() {
    if (!this.disconnectHandler) {
      const { tournamentDisconnectHandler } = await import('../../server/disconnect/TournamentDisconnectHandler.js');
      this.disconnectHandler = tournamentDisconnectHandler;
    }
    return this.disconnectHandler;
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
      const disconnectHandler = await this.getDisconnectHandler();
      disconnectHandler.handleWaitingRoomDisconnect(existingPlayer.playerId, existingPlayer.waitingRoomId, 'player_replaced');
      
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
      const waitingRoomId = TournamentRoomFactory.generateTournamentId();
      waitingRoom = TournamentRoomFactory.createTournamentWaitingRoom(waitingRoomId);
      
      // Create all tournament rooms upfront
      const tournamentRooms = TournamentRoomFactory.createTournamentRooms(waitingRoomId);
      
      // Store waiting room data
      this.waitingRooms.set(waitingRoomId, {
        id: waitingRoomId,
        players: [],
        tournamentRooms: tournamentRooms,
        createdAt: Date.now(),
        phase: TournamentPhases.WAITING
      });
      
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
    if (waitingRoom.players.length === TournamentConfig.MAX_PLAYERS_PER_WAITING_ROOM) {
      console.log(`🏆 Waiting room ${waitingRoom.id} is full! Starting tournament...`);
      return { waitingRoom, shouldStartTournament: true };
    } else {
      console.log(`🏆 Waiting room ${waitingRoom.id} needs ${TournamentConfig.MAX_PLAYERS_PER_WAITING_ROOM - waitingRoom.players.length} more players to start`);
      return { waitingRoom, shouldStartTournament: false };
    }
  }

  /**
   * Remove player from tournament waiting room (explicit leave)
   */
  async removePlayerFromTournament(playerId, username) {
    console.log(`🏆 Player ${username} (${playerId}) explicitly leaving tournament waiting room`);
    
    // Find which waiting room the player is in
    for (const [waitingRoomId, waitingRoomData] of this.waitingRooms) {
      const playerIndex = waitingRoomData.players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        // Found the player, remove them
        const disconnectHandler = await this.getDisconnectHandler();
        disconnectHandler.handleWaitingRoomDisconnect(playerId, waitingRoomId, 'player_left');
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
      
      if (room && room.players.length < TournamentConfig.MAX_PLAYERS_PER_WAITING_ROOM && !room.isGameOver) {
        console.log(`🏆 DEBUG: Found available room ${waitingRoomId} with ${room.players.length} players`);
        return room;
      }
    }
    
    console.log(`🏆 DEBUG: No available waiting room found, will create new one`);
    return null;
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
      
      // Check if waiting room is now empty
      if (waitingRoomData.players.length === 0) {
        console.log(`🏆 Waiting room ${waitingRoomId} is now empty, cleaning up`);
        return { shouldCleanup: true };
      }
    }
    
    return { shouldCleanup: false };
  }
} 