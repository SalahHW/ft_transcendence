import { gameStateManager } from '../../../../game/GameStateManager.js';
import { BaseDisconnectUtils } from '../../../disconnectHandler.js';

/**
 * Tournament-specific disconnect utilities
 */
export class TournamentDisconnectUtils {
  /**
   * Check if room is a tournament room
   */
  static isTournamentRoom(room) {
    return room.metadata?.isTournament === true;
  }

  /**
   * Get tournament room type
   */
  static getTournamentRoomType(room) {
    if (!this.isTournamentRoom(room)) {
      return 'regular';
    }
    
    const tournamentType = room.metadata?.tournamentType;
    
    switch (tournamentType) {
      case 'elimination':
        return 'waiting';
      case 'semifinal':
        return 'semifinal';
      case 'final':
        return 'final';
      default:
        return 'unknown';
    }
  }

  /**
   * Clean up player connection and associated data
   */
  static cleanupPlayerConnection(playerId, connectionMetadata) {
    const player = gameStateManager.getPlayer(playerId);
    
    if (player && player.ws) {
      BaseDisconnectUtils.cleanupWebSocket(player.ws);
    }
    
    // Remove player from game state
    gameStateManager.removePlayer(playerId);
    
    // Clean up connection metadata
    if (connectionMetadata) {
      connectionMetadata.delete(playerId);
    }
    
    console.log(`🧹 Cleaned up tournament player connection ${playerId}`);
  }

  /**
   * Get tournament disconnection reasons
   */
  static getTournamentDisconnectionReasons(baseReasons) {
    return {
      ...baseReasons,
      SEMI_FINAL_DISCONNECT: 'semi_final_disconnect',
      FINAL_DISCONNECT: 'final_disconnect',
      WAITING_ROOM_DISCONNECT: 'waiting_room_disconnect',
      PLAYER_LEFT: 'player_left'
    };
  }
} 