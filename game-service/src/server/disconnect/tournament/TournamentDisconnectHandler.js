import { gameStateManager } from '../../../game/GameStateManager.js';
import { playerManager } from '../../../player/PlayerManager.js';
import { tournamentManager } from '../../../room/tournamentManager.js';
import { BaseDisconnectHandler, DisconnectReasons } from '../../disconnectHandler.js';
import { TournamentDisconnectUtils } from './utils/TournamentDisconnectUtils.js';
import { TournamentStageManager } from './managers/TournamentStageManager.js';

/**
 * Main tournament disconnection handler - orchestrates other managers and services
 * Extends the base disconnection handler with tournament-specific logic
 */
export class TournamentDisconnectHandler extends BaseDisconnectHandler {
  constructor() {
    super();
    this.tournamentDisconnectionReasons = TournamentDisconnectUtils.getTournamentDisconnectionReasons(DisconnectReasons);
  }

  /**
   * Main entry point for tournament disconnection handling
   */
  handleTournamentPlayerDisconnect(playerId, roomId) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.log(`Room ${roomId} not found during tournament disconnect`);
      return;
    }

    const player = gameStateManager.getPlayer(playerId);
    const isExplicitLeave = player?.isLeaving === true;
    
    console.log(`🏆🔥 TOURNAMENT DISCONNECT: Player ${playerId} from tournament room ${roomId} ${isExplicitLeave ? '(EXPLICIT LEAVE)' : '(UNEXPECTED DISCONNECT)'}`);
    
    // Determine tournament room type and handle accordingly
    const roomType = TournamentDisconnectUtils.getTournamentRoomType(room);
    
    switch (roomType) {
      case 'waiting':
        return TournamentStageManager.handleWaitingRoomDisconnect(playerId, roomId, isExplicitLeave, this.connectionMetadata);
      case 'semifinal':
        return TournamentStageManager.handleSemiFinalDisconnect(playerId, roomId, isExplicitLeave, tournamentManager, this.connectionMetadata);
      case 'final':
        return TournamentStageManager.handleFinalDisconnect(playerId, roomId, isExplicitLeave, tournamentManager, this.connectionMetadata);
      default:
        console.warn(`Unknown tournament room type: ${roomType}`);
        return;
    }
  }

  /**
   * Handle explicit leave game message for tournaments
   */
  handleTournamentLeaveGameMessage(playerId, roomId) {
    console.log(`🏆 Player ${playerId} is explicitly leaving the tournament in room ${roomId}`);
    playerManager.markPlayerLeaving(playerId);
    this.handleTournamentPlayerDisconnect(playerId, roomId);
  }
}

// Export the handler class
export const tournamentDisconnectionHandler = new TournamentDisconnectHandler(); 