// Export game client functions
export { initializeGame, cleanup, leaveGame, setupJoinGameButton } from './client/client.js';

// Export game mode handlers
export { handleSimpleMatch } from './gameMode/1v1Handler.js';
export { handleTournament } from './gameMode/tournament/TournamentHandler.js';

// Export splash screen utilities
export { MatchType } from './ui/splashScreen.js'; 