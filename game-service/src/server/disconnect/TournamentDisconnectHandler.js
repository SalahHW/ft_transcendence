/**
 * Tournament specific disconnect handler
 * Simplified version that only handles waiting room disconnections
 * All other tournament disconnections are delegated to 1v1 handler
 */

import { BaseDisconnectHandler, PlayerStates, DisconnectionReasons, MatchTypes } from './BaseDisconnectHandler.js';
import { gameStateManager } from '../../game/GameStateManager.js';
import { oneVOneDisconnectHandler } from './OneVOneDisconnectHandler.js';
import { tournamentManager } from '../../tournament/TournamentManager.js';
import { TournamentRoomTypes } from '../../tournament/constants.js';

/**
 * Tournament specific disconnect handler
 */
export class TournamentDisconnectHandler extends BaseDisconnectHandler {
  constructor() {
    super();
    this.matchType = MatchTypes.TOURNAMENT;
  }

  /**
   * Handle unexpected disconnection
   */
  handleDisconnection(playerId, roomId, reason) {
    console.log(`🏆 TOURNAMENT DISCONNECT: Player ${playerId} from room ${roomId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.log(`Room ${roomId} not found for tournament disconnect handling`);
      this.removePlayerFromGame(playerId);
      return;
    }

    // Clean up player connection first
    this.removePlayerFromGame(playerId);
    
    // Check if this is a tournament waiting room
    if (room.metadata?.roomType === TournamentRoomTypes.WAITING && room.matchType === 'tournament') {
      console.log(`🏆 Tournament waiting room disconnect detected for player ${playerId}`);
      this.handleWaitingRoomDisconnect(playerId, roomId, reason);
    } else {
      // For all other tournament rooms (semi-finals, finals), delegate to 1v1 handler
      console.log(`🏆 Delegating tournament room disconnect to 1v1 handler for player ${playerId}`);
      oneVOneDisconnectHandler.handleDisconnection(playerId, roomId, reason);
    }
  }

  /**
   * Handle explicit leave game button click
   */
  handleExplicitLeave(playerId, roomId) {
    console.log(`🏃 Tournament player ${playerId} explicitly leaving tournament in room ${roomId}`);
    
    // Mark player as leaving
    const player = gameStateManager.getPlayer(playerId);
    if (player) {
      player.isLeaving = true;
    }
    
    // Handle as disconnection with explicit reason
    this.handleDisconnection(playerId, roomId, DisconnectionReasons.PLAYER_LEFT);
  }

  /**
   * Handle disconnection from tournament waiting room
   */
  handleWaitingRoomDisconnect(playerId, roomId, reason) {
    console.log(`🏆 Handling tournament waiting room disconnect for player ${playerId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room || room.metadata?.roomType !== TournamentRoomTypes.WAITING || room.matchType !== 'tournament') {
      console.error(`Invalid tournament waiting room for disconnect: ${roomId}`);
      return;
    }
    
    // Get waiting room data from tournament manager
    const waitingRoomData = tournamentManager.waitingRooms.get(roomId);
    if (!waitingRoomData) {
      console.error(`Waiting room data not found for ${roomId}`);
      return;
    }
    
    // Find the player being removed for logging
    const removedPlayer = waitingRoomData.players.find(p => p.id === playerId);
    const playerUsername = removedPlayer?.username || playerId;
    
    // Mark player as disconnected instead of removing them
    const player = waitingRoomData.players.find(p => p.id === playerId);
    if (player) {
      player.connected = false;
      player.disconnectedAt = Date.now();
    }

    // Update player status in the Map
    const playerStatus = waitingRoomData.playerStatus.get(playerId);
    if (playerStatus) {
      playerStatus.connected = false;
      playerStatus.disconnectedAt = Date.now();
    }

    // Add to disconnected players array
    if (!waitingRoomData.disconnectedPlayers.includes(playerId)) {
      waitingRoomData.disconnectedPlayers.push(playerId);
    }

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
    
    // Instead of sending a tournamentPlayerLeft notification, just broadcast the updated waiting room status
    if (tournamentManager.communicationManager && typeof tournamentManager.communicationManager.broadcastWaitingRoomStatus === 'function') {
      tournamentManager.communicationManager.broadcastWaitingRoomStatus(roomId);
    }
  }

  /**
   * Clean up all tournament rooms
   */
  cleanupTournamentRooms(waitingRoomId) {
    console.log(`🏆 Cleaning up all tournament rooms for waiting room ${waitingRoomId}`);
    
    const waitingRoomData = tournamentManager.waitingRooms.get(waitingRoomId);
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
    tournamentManager.waitingRooms.delete(waitingRoomId);
    
    console.log(`🏆 Tournament cleanup completed for ${waitingRoomId}`);
  }

  /**
   * Handle player state update from client
   */
  handlePlayerStateUpdate(playerId, roomId, state) {
    if (Object.values(PlayerStates).includes(state)) {
      this.setPlayerState(playerId, roomId, state);
      this.updatePlayerActivity(playerId);
    } else {
      console.warn(`Invalid tournament player state: ${state} for player ${playerId}`);
    }
  }

  /**
   * Handle browser events for tournament waiting rooms
   */
  handleBrowserEvent(playerId, roomId, eventType) {
    console.log(`🌐 Tournament browser event: ${eventType} for player ${playerId} in room ${roomId}`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`Room ${roomId} not found for tournament browser event handling`);
      return;
    }

    let reason;
    switch (eventType) {
      case 'beforeunload':
      case 'pagehide':
      case 'unload':
      case 'popstate':
      case 'visibility_timeout':
        reason = 'browser_navigation';
        break;
      case 'visibilitychange':
        // Don't treat visibility change as disconnect
        return;
      default:
        reason = 'browser_event';
    }

    // Check if this is a tournament waiting room
    if (room.metadata?.roomType === TournamentRoomTypes.WAITING && room.matchType === 'tournament') {
      console.log(`🏆 Tournament waiting room browser event: ${eventType} for player ${playerId}`);
      this.handleWaitingRoomDisconnect(playerId, roomId, reason);
    } else {
      // Handle as regular tournament disconnect (delegate to 1v1)
      this.handleDisconnection(playerId, roomId, reason);
    }
  }
}

// Export singleton instance
export const tournamentDisconnectHandler = new TournamentDisconnectHandler(); 