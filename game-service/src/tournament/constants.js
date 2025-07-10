/**
 * Tournament Constants
 * Defines tournament phases and room types
 */

/**
 * Tournament phases
 */
export const TournamentPhases = {
  WAITING: 'waiting',
  SEMI_FINALS: 'semi_finals',
  WINNER_FINAL: 'winner_final',
  LOSER_FINAL: 'loser_final',
  FINISHED: 'finished'
};

/**
 * Tournament room types
 */
export const TournamentRoomTypes = {
  WAITING: 'waiting',
  SEMI_FINAL_A: 'semi_final_a',
  SEMI_FINAL_B: 'semi_final_b',
  WINNER_FINAL: 'winner_final',
  LOSER_FINAL: 'loser_final'
};

/**
 * Tournament configuration
 */
export const TournamentConfig = {
  MAX_PLAYERS_PER_WAITING_ROOM: 4,
  MAX_PLAYERS_PER_MATCH: 2,
  INACTIVITY_THRESHOLD: 5 * 60 * 1000, // 5 minutes
  CLEANUP_INTERVAL: 30000, // 30 seconds
}; 