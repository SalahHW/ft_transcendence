/**
 * Tournament Communication Manager
 * Handles all tournament-related communication with players
 */

import { gameStateManager } from '../../game/GameStateManager.js';

/**
 * Tournament Communication Manager
 */
export class TournamentCommunicationManager {
  constructor(tournamentManager) {
    this.tournamentManager = tournamentManager;
  }

  /**
   * Send message to a specific player
   */
  sendToPlayer(roomId, playerId, message) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) return false;

    const player = room.players.find(p => p.id === playerId);
    if (!player || !player.ws || player.ws.readyState !== 1) {
      return false;
    }

    try {
      player.ws.send(JSON.stringify(message));
      return true;
    } catch (e) {
      console.error(`Failed to send ${message.type} to player ${playerId} in room ${roomId}:`, e);
      return false;
    }
  }

  /**
   * Send tournament completion message to all players
   */
  _sendTournamentCompletionMessage(waitingRoomId, matchData) {
    const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) return;
    
    // Get all tournament rooms
    const rooms = [
      waitingRoomData.tournamentRooms.semiFinalA,
      waitingRoomData.tournamentRooms.semiFinalB,
      waitingRoomData.tournamentRooms.winnerFinal,
      waitingRoomData.tournamentRooms.loserFinal
    ];
    
    // Send completion message to all players in all rooms
    rooms.forEach(room => {
      if (room && room.players) {
        room.players.forEach(player => {
          if (player.ws && player.ws.readyState === 1) {
            try {
              player.ws.send(JSON.stringify({
                type: 'tournamentAdvancement',
                status: 'tournament_complete',
                winner: matchData.winner,
                message: '🏆 Tournament complete!'
              }));
            } catch (error) {
              console.error(`Failed to send tournament completion to ${player.username}:`, error);
            }
          }
        });
      }
    });
  }

  /**
   * Send waiting room status to all connected players
   */
  broadcastWaitingRoomStatus(waitingRoomId) {
    this.tournamentManager.broadcastManager.broadcastWaitingRoomStatus(waitingRoomId);
  }
} 