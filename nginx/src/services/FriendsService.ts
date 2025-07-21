import FriendsServiceAPI from './api/friends.js';
import UsersApi from './api/user.js';
import AvatarServiceAPI from './api/avatar.js';
import MatchServiceAPI from './api/match.js';
import CacheManager, { CacheableService } from './CacheManager.js';

export interface EnrichedFriend {
    id: number;
    username: string;
    avatarUrl: string;
    status: 'online' | 'offline';
    wins: number;
    losses: number;
    wallet?: string;
}

/**
 * Service to manage the current user's friends list, including caching.
 */
export default class FriendsService implements CacheableService {
    private static _instance: FriendsService;
    private _friendsApi = new FriendsServiceAPI();
    private _usersApi = new UsersApi();
    private _avatarApi = new AvatarServiceAPI();
    private _matchApi = new MatchServiceAPI();
    private _enrichedFriendsCache: EnrichedFriend[] | null = null;
    public readonly serviceName = 'FriendsService';

    private constructor() {
        const cacheManager = CacheManager.getInstance();
        cacheManager.registerService(this, [
            'USER_LOGIN',
            'USER_LOGOUT',
            'FRIEND_ADDED',
            'FRIEND_REMOVED',
            'MATCH_ADDED'
        ]);
    }

    public static getInstance(): FriendsService {
        if (!FriendsService._instance) {
            FriendsService._instance = new FriendsService();
        }
        return FriendsService._instance;
    }

    public async getEnrichedFriends(): Promise<EnrichedFriend[]> {
        if (this._enrichedFriendsCache) {
            return this._enrichedFriendsCache;
        }

        const friendships = await this._friendsApi.getUserFriendships();

        if (friendships.length === 0) {
            return [];
        }

        const enrichedFriends = await Promise.all(
            friendships.map(async (friendship) => {
                try {
                    const friendUser = await this._usersApi.getUserById(friendship.friend_id);
					if (!friendUser) {
						throw new Error(`User with id ${friendship.friend_id} not found`);
					}

					let avatarUrl: string;
					try {
						const baseAvatarUrl = await this._avatarApi.getUserAvatarUrl(friendUser.id!);
						avatarUrl = this._addCacheBusting(baseAvatarUrl);
					} catch (error) {
						avatarUrl = '/assets/defaultAvatar.jpg';
					}

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
        return this._friendsApi.getUserFriendships();
    }

    /**
     * Clears the local cache for the friends list.
     */
    public clearCache(): void {
        this._enrichedFriendsCache = null;
    }

    /**
     * Adds cache-busting parameter to an avatar URL
     * @param url - The base avatar URL
     * @returns The URL with cache-busting parameter
     */
    private _addCacheBusting(url: string): string {
        if (url === '/assets/defaultAvatar.jpg') {
        }
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}t=${Date.now()}`;
    }

    /**
     * Adds a friend to the current user's friend list.
     * @param friendId - The ID of the user to befriend.
     */
    public async addFriend(friendId: number): Promise<void> {
        await this._friendsApi.createFriendship(friendId);

        const cacheManager = CacheManager.getInstance();
        cacheManager.triggerEvent({
            type: 'FRIEND_ADDED',
            data: { friendId }
        });
    }

    /**
     * Removes a friend from the current user's friend list.
     * @param friendId - The ID of the friend to remove.
     */
    public async removeFriend(friendId: number): Promise<void> {
        await this._friendsApi.deleteFriendship(friendId);

        const cacheManager = CacheManager.getInstance();
        cacheManager.triggerEvent({
            type: 'FRIEND_REMOVED',
            data: { friendId }
        });
    }
}
