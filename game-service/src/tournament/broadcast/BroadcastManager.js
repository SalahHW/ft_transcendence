/**
 * Tournament Broadcast Manager
 * Handles status broadcasting to tournament players
 */

import { gameStateManager } from '../../game/GameStateManager.js';

export class TournamentBroadcastManager {
  constructor(waitingRooms) {
    this.waitingRooms = waitingRooms;
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
   * Broadcast tournament start message
   */
  broadcastTournamentStart(waitingRoomId, players) {
    const message = {
      type: 'tournamentStart',
      roomId: waitingRoomId,
      players: players.map(p => ({
        id: p.id,
        username: p.username
      }))
    };
    
    // Send to all players in the waiting room
    const room = gameStateManager.getRoom(waitingRoomId);
    if (room) {
      room.players.forEach(player => {
        if (player.ws && player.ws.readyState === 1) {
          try {
            player.ws.send(JSON.stringify(message));
          } catch (error) {
            console.error(`Failed to send tournament start to player ${player.id}:`, error);
          }
        }
      });
    }
  }

  /**
   * Broadcast match assignment to players
   */
  broadcastMatchAssignment(playerId, roomId, opponentId, opponentUsername, matchType) {
    const message = {
      type: 'matchAssignment',
      roomId: roomId,
      opponentId: opponentId,
      opponentUsername: opponentUsername,
      matchType: matchType
    };
    
    const player = gameStateManager.getPlayer(playerId);
    if (player && player.ws && player.ws.readyState === 1) {
      try {
        player.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send match assignment to player ${playerId}:`, error);
      }
    }
  }
} 