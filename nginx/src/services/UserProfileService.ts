import AuthNanoService from './AuthNanoService.js';
import UsersApi, { User } from './api/user.js';
import CacheManager, { CacheableService } from './CacheManager.js';
import AvatarService from './AvatarService.js';
import MatchServiceAPI from './api/match.js';

export interface EnrichedUser extends User {
    avatarUrl: string;
    totalWins: number;
    totalLosses: number;
}

/**
 * Service to manage user profile data, including caching.
 */
export default class UserProfileService implements CacheableService {
    private static _instance: UserProfileService;
    private _authService = AuthNanoService.getInstance();
    private _usersApi = new UsersApi();
    private _avatarService = AvatarService.getInstance();
    private _matchApi = new MatchServiceAPI();
    private _enrichedUserProfileCache: EnrichedUser | null = null;
    public readonly serviceName = 'UserProfileService';

    private constructor() {
        const cacheManager = CacheManager.getInstance();
        cacheManager.registerService(this, [
            'USER_LOGIN',
            'USER_LOGOUT',
            'PROFILE_UPDATED',
            'AVATAR_UPDATED',
            'MATCH_ADDED'
        ]);
    }

    public static getInstance(): UserProfileService {
        if (!UserProfileService._instance) {
            UserProfileService._instance = new UserProfileService();
        }
        return UserProfileService._instance;
    }

    /**
     * Gets the full user profile, enriched with avatar URL and match stats.
     * Implements a simple cache-on-read strategy.
     * @returns A promise that resolves to the enriched user profile.
     */
    public async getEnrichedUserProfile(): Promise<EnrichedUser> {
        if (this._enrichedUserProfileCache) {
            return this._enrichedUserProfileCache;
        }

        const jwtPayload = await this._authService.getJwtPayload();
        if (!jwtPayload?.sub) {
            throw new Error("User not authenticated or user ID is missing.");
        }

        const baseUser = await this._usersApi.getUserById(jwtPayload.sub);

        const [avatarUrl, matches] = await Promise.all([
            this._avatarService.getCurrentUserAvatarUrl(),
            baseUser.wallet ? this._matchApi.getMatchesByPlayer(baseUser.wallet) : Promise.resolve([])
        ]);

        let totalWins = 0;
        let totalLosses = 0;
        if (baseUser.wallet && matches) {
            matches.forEach(match => {
                if (match.winner === baseUser.wallet) {
                    totalWins++;
                } else {
                    totalLosses++;
                }
            });
        }

        const enrichedUser: EnrichedUser = {
            ...baseUser,
            avatarUrl,
            totalWins,
            totalLosses,
        };

        this._enrichedUserProfileCache = enrichedUser;
        return enrichedUser;
    }

    /**
     * Updates the user's username on the server and invalidates the cache.
     * @param username - The new username
     * @returns A promise that resolves to the updated user profile.
     */
    public async updateUsername(username: string): Promise<User> {
        const jwtPayload = await this._authService.getJwtPayload();
        if (!jwtPayload?.sub) {
            throw new Error("User not authenticated or user ID is missing.");
        }
        try {
            const updatedUser = await this._usersApi.updateUsername(username);
            const cacheManager = CacheManager.getInstance();
            cacheManager.triggerEvent({
                type: 'PROFILE_UPDATED',
                data: { userId: updatedUser.id, username: updatedUser.username }
            });
            return updatedUser;
        } catch (error) {
            throw new Error(`Failed to update username: ${error}`);
        }
    }

    /**
     * Updates the user's email on the server and invalidates the cache.
     * @param email - The new email
     * @returns A promise that resolves to the updated user profile.
     */
    public async updateEmail(email: string): Promise<User> {
        const jwtPayload = await this._authService.getJwtPayload();
        if (!jwtPayload?.sub) {
            throw new Error("User not authenticated or user ID is missing.");
        }

        try {
            const updatedUser = await this._usersApi.updateEmail(email);
            const cacheManager = CacheManager.getInstance();
            cacheManager.triggerEvent({
                type: 'PROFILE_UPDATED',
                data: { userId: updatedUser.id, email: updatedUser.email }
            });
            return updatedUser;
        } catch (error) {
            throw new Error(`Failed to update email: ${error}`);
        }
    }

    /**
     * Clears the local cache for the user profile.
     */
    public clearCache(): void {
        this._enrichedUserProfileCache = null;
    }
}
