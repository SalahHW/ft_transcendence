/**
 * Tournament Module Index
 * Exports all tournament-related server functionality
 */

// Main exports (backward compatibility)
export { tournamentManager } from '../room/tournamentManager.js';
export { TournamentGameHandler } from './tournamentGameHandler.js';

// New modular exports
export * as TournamentUtils from './utils/TournamentUtils.js';
export * as TournamentStateManager from './state/TournamentStateManager.js';
export * as TournamentRoomManager from './room/TournamentRoomManager.js';
export * as TournamentDisconnectHandler from './disconnect/TournamentDisconnectHandler.js';
export * as TournamentFinalManager from './finals/TournamentFinalManager.js';
export * as TournamentProgressionManager from './progression/TournamentProgressionManager.js'; 