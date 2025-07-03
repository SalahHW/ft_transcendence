// Re-export the refactored tournament disconnect handler
export { TournamentDisconnectHandler, tournamentDisconnectionHandler } from './disconnect/tournament/TournamentDisconnectHandler.js';

// For backward compatibility, also export the individual components
export { TournamentDisconnectUtils } from './disconnect/tournament/utils/TournamentDisconnectUtils.js';
export { TournamentForfeitManager } from './disconnect/tournament/managers/TournamentForfeitManager.js';
export { TournamentStageManager } from './disconnect/tournament/managers/TournamentStageManager.js';
export { TournamentProgressionManager } from './disconnect/tournament/managers/TournamentProgressionManager.js';
export { TournamentNotificationService } from './disconnect/tournament/services/TournamentNotificationService.js';