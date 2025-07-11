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
   * Send tournament completion message to all players with their final placement
   */
  _sendTournamentCompletionMessage(waitingRoomId, matchData) {
    const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) return;
    
    // Calculate final tournament standings
    const finalStandings = this._calculateTournamentStandings(waitingRoomData);
    
    // Get all tournament rooms
    const rooms = [
      waitingRoomData.tournamentRooms.semiFinalA,
      waitingRoomData.tournamentRooms.semiFinalB,
      waitingRoomData.tournamentRooms.winnerFinal,
      waitingRoomData.tournamentRooms.loserFinal
    ];
    
    // Send completion message to all players in all rooms with their placement
    rooms.forEach(room => {
      if (room && room.players) {
        room.players.forEach(player => {
          if (player.ws && player.ws.readyState === 1) {
            try {
              // Find player's placement
              const playerPlacement = finalStandings.find(p => p.id === player.id)?.placement || 4;
              
              player.ws.send(JSON.stringify({
                type: 'tournamentAdvancement',
                status: 'tournament_complete',
                winner: matchData.winner,
                playerPlacement: playerPlacement,
                finalStandings: finalStandings,
                message: `🏆 Tournament complete! You finished ${this._getPlacementText(playerPlacement)}!`
              }));
              
              // Close the WebSocket connection after sending completion message
              // This prevents keep-alive messages from disconnected players
              console.log(`🏆 Closing WebSocket connection for player ${player.username} (${player.id}) after tournament completion`);
              player.ws.close(1000, 'Tournament completed');
              
            } catch (error) {
              console.error(`Failed to send tournament completion to ${player.username}:`, error);
            }
          }
        });
      }
    });
    
    // ⭐ CRITICAL FIX: Clean up stale waiting room data immediately after tournament completion
    // This prevents issues where players can't join new tournaments due to stale data
    setTimeout(async () => {
      try {
        await this.tournamentManager.cleanupManager.cleanupStaleWaitingRoomData();
        console.log('🏆 Stale waiting room data cleaned up immediately after tournament completion');
      } catch (error) {
        console.error('🏆 Error cleaning up stale waiting room data immediately after tournament completion:', error);
      }
    }, 100); // Small delay to ensure completion messages are sent first
    
    // ⭐ FIX: Also close any remaining WebSocket connections that might be lingering
    setTimeout(() => {
      this._forceCleanupRemainingConnections(waitingRoomId, finalStandings);
    }, 5000); // 5 second delay to allow normal completion messages to be sent
  }
  
  /**
   * Force cleanup of any remaining WebSocket connections
   */
  _forceCleanupRemainingConnections(waitingRoomId, finalStandings) {
    const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) return;
    
    // Get all players from all tournament rooms
    const allPlayers = [];
    const rooms = [
      waitingRoomData.tournamentRooms.semiFinalA,
      waitingRoomData.tournamentRooms.semiFinalB,
      waitingRoomData.tournamentRooms.winnerFinal,
      waitingRoomData.tournamentRooms.loserFinal
    ];
    
    rooms.forEach(room => {
      if (room && room.players) {
        allPlayers.push(...room.players);
      }
    });
    
    // Close any remaining WebSocket connections
    allPlayers.forEach(player => {
      if (player.ws && player.ws.readyState === 1) {
        try {
          console.log(`🏆 Force closing remaining WebSocket connection for player ${player.username} (${player.id})`);
          player.ws.close(1000, 'Tournament cleanup');
        } catch (error) {
          console.error(`Failed to force close WebSocket for player ${player.username}:`, error);
        }
      }
    });
  }

  /**
   * Calculate final tournament standings based on match results
   */
  _calculateTournamentStandings(waitingRoomData) {
    const standings = [];
    
    // Get final results
    const winnerFinalResult = waitingRoomData.finalResults?.winner_final;
    const loserFinalResult = waitingRoomData.finalResults?.loser_final;
    
    if (winnerFinalResult && loserFinalResult) {
      // 1st place: Winner of winner final
      standings.push({
        id: winnerFinalResult.winner.id,
        username: winnerFinalResult.winner.username,
        placement: 1
      });
      
      // 2nd place: Loser of winner final
      standings.push({
        id: winnerFinalResult.loser.id,
        username: winnerFinalResult.loser.username,
        placement: 2
      });
      
      // 3rd place: Winner of loser final (or first loser if forfeit)
      standings.push({
        id: loserFinalResult.winner.id,
        username: loserFinalResult.winner.username,
        placement: 3
      });
      
      // 4th place: Loser of loser final (or second loser if forfeit)
      standings.push({
        id: loserFinalResult.loser.id,
        username: loserFinalResult.loser.username,
        placement: 4
      });
    }
    
    return standings;
  }

  /**
   * Get placement text for display
   */
  _getPlacementText(placement) {
    switch (placement) {
      case 1: return '1st';
      case 2: return '2nd';
      case 3: return '3rd';
      case 4: return '4th';
      default: return `${placement}th`;
    }
  }

  /**
   * Get placement suffix for display
   */
  _getPlacementSuffix(placement) {
    switch (placement) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  /**
   * Send individual final match completion message to players in the room
   */
  _sendIndividualFinalMatchCompletion(waitingRoomId, roomId, roomType, winner, loser) {
    const room = gameStateManager.getRoom(roomId);
    if (!room || !room.players) return;
    
    // Determine placements based on room type
    let winnerPlacement, loserPlacement;
    if (roomType === 'winner_final') {
      winnerPlacement = 1; // Winner of winner final gets 1st place
      loserPlacement = 2;  // Loser of winner final gets 2nd place
    } else if (roomType === 'loser_final') {
      winnerPlacement = 3; // Winner of loser final gets 3rd place
      loserPlacement = 4;  // Loser of loser final gets 4th place
    } else {
      console.error(`Unknown final room type: ${roomType}`);
      return;
    }
    
    // Send completion message to both players in the room
    room.players.forEach(player => {
      if (player.ws && player.ws.readyState === 1) {
        try {
          const isWinner = player.id === winner.id;
          const placement = isWinner ? winnerPlacement : loserPlacement;
          
          player.ws.send(JSON.stringify({
            type: 'tournamentAdvancement',
            status: 'final_match_complete',
            playerPlacement: placement,
            isWinner: isWinner,
            opponentName: isWinner ? loser.username : winner.username,
            message: `🏆 Final match complete! You finished ${this._getPlacementText(placement)}!`
          }));
          
          // Close WebSocket connection for players who are eliminated (3rd and 4th place)
          // This prevents keep-alive messages from players who are no longer in the tournament
          if (placement >= 3) {
            console.log(`🏆 Closing WebSocket connection for eliminated player ${player.username} (${player.id}) - finished ${placement}${this._getPlacementSuffix(placement)}`);
            player.ws.close(1000, 'Tournament placement determined');
          }
          
        } catch (error) {
          console.error(`Failed to send final match completion to ${player.username}:`, error);
        }
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