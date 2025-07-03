// Re-export the refactored tournament client handler
export { TournamentClientHandler } from './tournamentClientHandlerNew.js';
export { default } from './tournamentClientHandlerNew.js';

// For backward compatibility, also export the individual components
export { TournamentAdvancementHandler } from './handlers/TournamentAdvancementHandler.js';
export { TournamentPlacementHandler } from './handlers/TournamentPlacementHandler.js';
export { TournamentGameStateManager } from './managers/TournamentGameStateManager.js';
export { TournamentUtils } from './utils/TournamentUtils.js'; 