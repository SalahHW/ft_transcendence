import CacheManager from './CacheManager.js';
import AvatarService from './AvatarService.js';
import FriendsService from './FriendsService.js';
import MatchHistoryService from './MatchHistoryService.js';
import UserProfileService from './UserProfileService.js';
import PresenceService from './webSocket/presence.js';
import AuthService from './AuthNanoService.js';

export function initializeServices(): void {
    console.log("Initializing services...");

    try {
        CacheManager.getInstance();

        AvatarService.getInstance();
        FriendsService.getInstance();
        MatchHistoryService.getInstance();
        UserProfileService.getInstance();
        const presenceService = PresenceService.getInstance();
        const authService = AuthService.getInstance();

        authService.isLoggedIn().then(loggedIn => {
            if (loggedIn) {
                presenceService.connect();
            }
        });

        console.log("Services initialized and registered with CacheManager.");
        const cacheStats = CacheManager.getInstance().getStats();
        console.log(`[CacheManager] Initial Stats: ${cacheStats.services} services registered, monitoring ${cacheStats.events} events.`);
    }
    catch ( error ) {
        console.log(error);
    }
}
