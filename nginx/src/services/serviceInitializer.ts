import CacheManager from './CacheManager.js';
import AvatarService from './AvatarService.js';
import FriendsService from './FriendsService.js';
import MatchHistoryService from './MatchHistoryService.js';
import UserProfileService from './UserProfileService.js';

export function initializeServices(): void {
    console.log("Initializing services...");

    CacheManager.getInstance();

    AvatarService.getInstance();
    FriendsService.getInstance();
    MatchHistoryService.getInstance();
    UserProfileService.getInstance();

    console.log("Services initialized and registered with CacheManager.");

    const cacheStats = CacheManager.getInstance().getStats();
    console.log(`[CacheManager] Initial Stats: ${cacheStats.services} services registered, monitoring ${cacheStats.events} events.`);
}
