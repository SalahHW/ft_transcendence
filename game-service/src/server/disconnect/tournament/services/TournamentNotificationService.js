import { gameEngine } from '../../../../game/GameEngine.js';

/**
 * Service for handling tournament player notifications
 */
export class TournamentNotificationService {
  /**
   * Notify tournament forfeit winner
   */
  static notifyTournamentForfeitWinner(roomId, remainingPlayer, matchData) {
    console.log(`🏆 notifyTournamentForfeitWinner called for player ${remainingPlayer.id} in room ${roomId}`);
    
    if (!remainingPlayer.ws || remainingPlayer.ws.readyState !== 1) {
      console.error(`🏆 Cannot notify forfeit winner ${remainingPlayer.id} - no valid WebSocket`);
      return;
    }

    try {
      // Send game end with forfeit victory
      const gameEndMessage = {
        type: 'gameEnd',
        ...matchData,
        reason: 'opponent_disconnect',
        tournamentAdvancement: {
          stage: matchData.tournamentStage,
          result: 'victory_by_forfeit',
          message: matchData.tournamentStage === 'semifinal' 
            ? 'Opponent disconnected. You advance to the final!'
            : 'Opponent disconnected. You win the tournament!',
          placement: 'advancing_to_final'
        }
      };
      
      remainingPlayer.ws.send(JSON.stringify(gameEndMessage));
      
      // For semi-finals, also send waiting state
      if (matchData.tournamentStage === 'semifinal') {
        setTimeout(() => {
          if (remainingPlayer.ws?.readyState === 1) {
            const waitingMessage = {
              type: 'waitingForPlayers',
              readyCount: 1,
              totalNeeded: 2,
              currentPlayerName: remainingPlayer.username || 'You',
              opponentName: 'Waiting for opponent...',
              playerId: remainingPlayer.id,
              isTournament: true,
              tournamentAdvancement: {
                status: 'waiting_for_final_after_forfeit',
                message: 'Waiting for the other semi-final to complete...',
                placement: 'advancing_to_final'
              }
            };
            
            console.log('🏆 Sending waiting message to forfeit winner:', waitingMessage);
            remainingPlayer.ws.send(JSON.stringify(waitingMessage));
          }
        }, 1000);
      }
    } catch (error) {
      console.error(`🏆 Error notifying forfeit winner ${remainingPlayer.username}:`, error);
    }
  }

  /**
   * Notify remaining player in tournament match
   */
  static notifyTournamentRemainingPlayer(roomId, matchData, tournamentStage) {
    const message = {
      type: 'gameEnd',
      ...matchData,
      reason: 'opponent_disconnect',
      tournamentAdvancement: {
        stage: tournamentStage,
        result: 'victory_by_forfeit',
        message: tournamentStage === 'semifinal' 
          ? 'Opponent disconnected. You advance to the final!'
          : 'Opponent disconnected. You win the tournament!'
      }
    };

    gameEngine.broadcastToRoom(roomId, message);
  }
} 