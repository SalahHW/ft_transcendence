import { gameStateManager } from '../../../../game/GameStateManager.js';
import { LogUtils } from '../../../../utils/helpers.js';
import { BaseDisconnectUtils } from '../../../disconnectHandler.js';
import { TournamentDisconnectUtils } from '../utils/TournamentDisconnectUtils.js';

/**
 * Manages tournament forfeit logic and match data creation
 */
export class TournamentForfeitManager {
  /**
   * Create tournament-specific forfeit match data for semi-finals
   */
  static createSemiFinalForfeitMatchData(room, roomId, remainingPlayer, disconnectedPlayer, actionText, disconnectionReason) {
    const baseMatchData = BaseDisconnectUtils.createBaseForfeitMatchData(
      room, 
      roomId, 
      remainingPlayer, 
      disconnectedPlayer, 
      actionText
    );

    return {
      type: 'gameEnd',
      ...baseMatchData,
      matchType: 'semi-final',  // Critical for client detection
      tournamentStage: 'semifinal',
      gameStats: {
        ...baseMatchData.gameStats,
        totalRebounds: room.gameStats?.totalRebounds || 0
      },
      disconnectionReason,
      tournamentAdvancement: {
        stage: 'semifinal',
        result: 'victory_by_forfeit',
        message: 'Opponent disconnected. You advance to the final!',
        placement: 'advancing_to_final'
      },
      tournamentPlacements: {
        fourthPlace: {
          id: disconnectedPlayer.id,
          username: disconnectedPlayer.username,
          reason: 'disconnected_in_semifinal'
        },
        remainingWinner: {
          id: remainingPlayer.id,
          username: remainingPlayer.username,
          status: 'advancing_to_final'
        }
      }
    };
  }

  /**
   * Create tournament-specific forfeit match data for finals
   */
  static createFinalForfeitMatchData(room, roomId, remainingPlayer, disconnectedPlayer, actionText, disconnectionReason) {
    const baseMatchData = BaseDisconnectUtils.createBaseForfeitMatchData(
      room, 
      roomId, 
      remainingPlayer, 
      disconnectedPlayer, 
      actionText
    );

    return {
      ...baseMatchData,
      tournamentStage: 'final',
      disconnectionReason,
      finalMatchType: room.metadata?.finalMatch
    };
  }

  /**
   * Process tournament forfeit and log results
   */
  static processTournamentForfeit(matchData, disconnectedPlayer) {
    // Log the tournament forfeit
    LogUtils.logMatchCompletion(matchData);
    
    // Report results to external APIs
    BaseDisconnectUtils.reportResults(matchData);
    
    // Clean up the forfeiting player
    TournamentDisconnectUtils.cleanupPlayerConnection(disconnectedPlayer.id);
    console.log(`🏆 Disconnected forfeiting player: ${disconnectedPlayer.username}`);
  }

  /**
   * Handle empty room after forfeit
   */
  static handleEmptyRoomAfterForfeit(room, roomId, tournamentManager) {
    const isLastPlayer = room.players.length <= 1;
    if (isLastPlayer) {
      console.log(`🏆 Tournament room ${roomId} is now empty (both players disconnected)`);
      
      if (room.metadata?.tournamentType === 'semifinal') {
        tournamentManager._markSemiFinalAsEmpty(roomId);
      }
      
      // Clean up the room immediately since it's empty
      gameStateManager.removeRoom(roomId);
      console.log(`🏆 Removed empty tournament room ${roomId}`);
      return true;
    }
    return false;
  }

  /**
   * Schedule lone player check after room cleanup
   */
  static scheduleLonePlayerCheck(room, tournamentManager, delay = 6000) {
    const tournamentId = room.metadata?.tournamentId;
    if (tournamentId) {
      // Wait for room cleanup to complete before checking
      setTimeout(() => {
        const lonePlayer = tournamentManager._checkForLonePlayerInTournament(tournamentId);
        if (lonePlayer) {
          console.log('🏆 🏆 LONE PLAYER SCENARIO DETECTED after disconnect and cleanup - awarding automatic tournament victory!');
          tournamentManager._awardAutomaticTournamentVictory(lonePlayer, tournamentId);
        }
      }, delay);
    }
  }
} 