import AuthNanoService from '../auth/AuthNanoService.js';
import FriendsServiceAPI from './api/friends.js';
import UsersApi, { User } from './api/user.js';
import AvatarServiceAPI from './api/avatar.js';
import MatchServiceAPI from './api/match.js';
import CacheManager, { CacheableService } from './CacheManager.js';

export interface EnrichedFriend {
    id: number;
    username: string;
    avatarUrl: string;
    status: 'online' | 'offline'; // Le statut sera 'offline' par défaut
    wins: number;
    losses: number;
    wallet?: string;
}

/**
 * Service to manage the current user's friends list, including caching.
 */
export default class FriendsService implements CacheableService {
    private static _instance: FriendsService;
    private _authService = AuthNanoService.getInstance();
    private _friendsApi = new FriendsServiceAPI();
    private _usersApi = new UsersApi();
    private _avatarApi = new AvatarServiceAPI();
    private _matchApi = new MatchServiceAPI();
    private _enrichedFriendsCache: EnrichedFriend[] | null = null;
    public readonly serviceName = 'FriendsService';

    private constructor() {
        // Register with CacheManager
        const cacheManager = CacheManager.getInstance();
        cacheManager.registerService(this, [
            'USER_LOGIN',
            'USER_LOGOUT',
            'FRIEND_ADDED',
            'FRIEND_REMOVED'
        ]);
    }

    public static getInstance(): FriendsService {
        if (!FriendsService._instance) {
            FriendsService._instance = new FriendsService();
        }
        return FriendsService._instance;
    }

    private async _getUserId(): Promise<number> {
        const jwtPayload = await this._authService.getJwtPayload();
        if (!jwtPayload?.sub) {
            throw new Error("User not authenticated or user ID is missing.");
        }
        return jwtPayload.sub;
    }

    public async getEnrichedFriends(): Promise<EnrichedFriend[]> {
        if (this._enrichedFriendsCache) {
            return this._enrichedFriendsCache;
        }

        const userId = await this._getUserId();
        const friendships = await this._friendsApi.getUserFriendships(userId);

        if (friendships.length === 0) {
            return [];
        }

        const enrichedFriends = await Promise.all(
            friendships.map(async (friendship) => {
                try {
                    const friendUser = await this._usersApi.getUserById(friendship.friend_id);
                    const avatarUrl = await this._avatarApi.getUserAvatarUrl(friendUser.id!)
                        .catch(() => '/assets/defaultAvatar.jpg');

                    let wins = 0;
                    let losses = 0;
                    if (friendUser.wallet) {
                        const matches = await this._matchApi.getMatchesByPlayer(friendUser.wallet);
                        matches.forEach(match => {
                            if (match.winner === friendUser.wallet) {
                                wins++;
                            } else {
                                losses++;
                            }
                        });
                    }

                    return {
                        id: friendUser.id!,
                        username: friendUser.username!,
                        avatarUrl,
                        status: 'offline' as const,
                        wins,
                        losses,
                        wallet: friendUser.wallet
                    };
                } catch (error) {
                    console.error(`Failed to enrich friend data for friend ID ${friendship.friend_id}`, error);
                    // Retourner un objet partiel pour ne pas bloquer toute la liste
                    return {
                        id: friendship.friend_id,
                        username: `User ${friendship.friend_id}`,
                        avatarUrl: '/assets/defaultAvatar.jpg',
                        status: 'offline' as const,
                        wins: 0,
                        losses: 0
                    };
                }
            })
        );

        this._enrichedFriendsCache = enrichedFriends;
        return enrichedFriends;
    }

    /**
     * Gets the list of friend IDs for the current user.
     * @returns A promise that resolves to an array of friend IDs.
     */
    public async getFriends(): Promise<any[]> {
        const userId = await this._getUserId();
        return this._friendsApi.getUserFriendships(userId);
    }

    /**
     * Clears the local cache for the friends list.
     */
    public clearCache(): void {
        this._enrichedFriendsCache = null;
    }

    /**
     * Adds a friend to the current user's friend list.
     * @param friendId - The ID of the user to befriend.
     */
    public async addFriend(friendId: number): Promise<void> {
        const userId = await this._getUserId();
        await this._friendsApi.createFriendship(userId, friendId);

        // Trigger cache invalidation event
        const cacheManager = CacheManager.getInstance();
        cacheManager.triggerEvent({
            type: 'FRIEND_ADDED',
            data: { friendId, userId }
        });
    }

    /**
     * Removes a friend from the current user's friend list.
     * @param friendId - The ID of the friend to remove.
     */
    public async removeFriend(friendId: number): Promise<void> {
        const userId = await this._getUserId();
        await this._friendsApi.deleteFriendship(userId, friendId);

        // Trigger cache invalidation event
        const cacheManager = CacheManager.getInstance();
        cacheManager.triggerEvent({
            type: 'FRIEND_REMOVED',
            data: { friendId, userId }
        });
    }
}
