/**
 * Tournament Module Index
 * Exports all tournament-related modules
 */

// Main tournament manager
export { TournamentManager, tournamentManager } from './TournamentManager.js';

// Constants
export { TournamentPhases, TournamentRoomTypes, TournamentConfig } from './constants.js';

// Room management
export { TournamentRoomFactory } from './rooms/TournamentRoomFactory.js';

// Player management
export { TournamentPlayerManager } from './waitingRoom/PlayerManager.js';

// Disconnect handling
export { TournamentDisconnectHandler } from './disconnect/DisconnectHandler.js';

// Cleanup management
export { TournamentCleanupManager } from './cleanup/CleanupManager.js';

// Broadcast management
export { TournamentBroadcastManager } from './broadcast/BroadcastManager.js';

// Match management
export { TournamentMatchManager } from './matchManagement/TournamentMatchManager.js';

// Transfer management
export { TournamentTransferManager } from './playerManagement/TournamentTransferManager.js';

// Communication management
export { TournamentCommunicationManager } from './communication/TournamentCommunicationManager.js';

// Lifecycle management
export { TournamentLifecycleManager } from './lifecycle/TournamentLifecycleManager.js'; 