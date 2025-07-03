/**
 * Manages tournament progression after forfeits and disconnections
 */
export class TournamentProgressionManager {
  /**
   * Progress tournament bracket after semi-final forfeit
   */
  static progressTournamentAfterSemiFinalForfeit(semiFinalRoom, matchData, disconnectedPlayer, remainingPlayer, tournamentManager) {
    try {
      tournamentManager.handleSemiFinalCompletion(semiFinalRoom.id, matchData);
    } catch (error) {
      console.error('Error processing tournament progression after forfeit:', error);
    }
  }
} 