/**
 * Tournament Disconnect Handler
 * Handles all tournament disconnection scenarios
 */

import { gameStateManager } from '../../game/GameStateManager.js';
import { LogUtils } from '../../utils/helpers.js';
import { TournamentRoomTypes } from '../constants.js';
import { GAME_CONFIG } from '../../core/constants.js';

export class TournamentDisconnectHandler {
  constructor(waitingRooms) {
    this.waitingRooms = waitingRooms;
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
      
      // Create match data for forfeit
      const matchData = {
        roomId,
        matchType: 'tournament_semi_final',
        winner: { id: remainingPlayer.id, username: remainingPlayer.username, score: GAME_CONFIG.WINNING_SCORE },
        loser: { id: playerId, username: 'Disconnected Player', score: 0 },
        forfeitReason: 'Player disconnected during semi-final'
      };
      
      // Log the forfeit
      LogUtils.logMatchCompletion(matchData);
      
      // Handle tournament advancement
      this._handleSemiFinalForfeitAdvancement(waitingRoomId, roomId, matchData);
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
      
      // Create match data for forfeit
      const matchData = {
        roomId,
        matchType: 'tournament_final',
        winner: { id: remainingPlayer.id, username: remainingPlayer.username, score: GAME_CONFIG.WINNING_SCORE },
        loser: { id: playerId, username: 'Disconnected Player', score: 0 },
        forfeitReason: 'Player disconnected during final'
      };
      
      // Log the forfeit
      LogUtils.logMatchCompletion(matchData);
      
      // Handle tournament completion
      this._handleFinalForfeitCompletion(waitingRoomId, roomId, matchData);
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
    
    // Close WebSocket connections for all players in all tournament rooms
    const rooms = [
      waitingRoomData.tournamentRooms.semiFinalA,
      waitingRoomData.tournamentRooms.semiFinalB,
      waitingRoomData.tournamentRooms.winnerFinal,
      waitingRoomData.tournamentRooms.loserFinal
    ];
    
    rooms.forEach(room => {
      if (room && room.players) {
        room.players.forEach(player => {
          if (player.ws && player.ws.readyState === 1) {
            try {
              console.log(`🏆 Closing WebSocket connection for player ${player.username} (${player.id}) during tournament cleanup`);
              player.ws.close(1000, 'Tournament cleanup');
            } catch (error) {
              console.error(`Failed to close WebSocket for player ${player.username}:`, error);
            }
          }
        });
      }
    });
    
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
   * Handle semi-final forfeit advancement
   */
  async _handleSemiFinalForfeitAdvancement(waitingRoomId, roomId, matchData) {
    try {
      // Import tournament manager dynamically to avoid circular dependencies
      const { tournamentManager } = await import('../TournamentManager.js');
      
      // Handle the semi-final match end with forfeit data
      await tournamentManager.handleSemiFinalMatchEnd(waitingRoomId, roomId, matchData);
    } catch (error) {
      console.error(`🏆 Error handling semi-final forfeit advancement:`, error);
    }
  }

  /**
   * Handle final forfeit completion
   */
  async _handleFinalForfeitCompletion(waitingRoomId, roomId, matchData) {
    try {
      // Import tournament manager dynamically to avoid circular dependencies
      const { tournamentManager } = await import('../TournamentManager.js');
      
      // Handle the final match end with forfeit data
      await tournamentManager.handleFinalMatchEnd(waitingRoomId, roomId, matchData);
    } catch (error) {
      console.error(`🏆 Error handling final forfeit completion:`, error);
    }
  }
} 