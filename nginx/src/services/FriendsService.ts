import AuthNanoService from '../auth/AuthNanoService.js';
import FriendsServiceAPI, { Friendship } from './api/friends.js';

/**
 * Service to manage user friends data, including caching.
 */
export default class FriendsService {
    private static _instance: FriendsService;
    private _authService = AuthNanoService.getInstance();
    private _friendsApi = new FriendsServiceAPI();
    private _friendsCache: Friendship[] | null = null;

    private constructor() {}

    public static getInstance(): FriendsService {
        if (!FriendsService._instance) {
            FriendsService._instance = new FriendsService();
        }
        return FriendsService._instance;
    }

    private async _getCurrentUserId(): Promise<number> {
        const jwtPayload = await this._authService.getJwtPayload();
        if (!jwtPayload?.sub) {
            throw new Error("User not authenticated or user ID is missing.");
        }
        return jwtPayload.sub;
    }

    /**
     * Gets the list of friends for the current user.
     * Implements a simple cache-on-read strategy.
     * @returns A promise that resolves to the list of friendships.
     */
    public async getFriends(): Promise<Friendship[]> {
        if (this._friendsCache !== null) {
            return this._friendsCache;
        }

        const userId = await this._getCurrentUserId();
        const friends = await this._friendsApi.getUserFriendships(userId);
        this._friendsCache = friends;

        return friends;
    }

    /**
     * Adds a friend for the current user.
     * @param friendId - The ID of the user to befriend.
     * @returns A promise that resolves when the friendship is created.
     */
    public async addFriend(friendId: number): Promise<void> {
        const userId = await this._getCurrentUserId();
        await this._friendsApi.createFriendship(userId, friendId);
        this.clearCache();
    }

    /**
     * Removes a friend for the current user.
     * @param friendId - The ID of the friend to remove.
     * @returns A promise that resolves when the friendship is deleted.
     */
    public async removeFriend(friendId: number): Promise<void> {
        const userId = await this._getCurrentUserId();
        await this._friendsApi.deleteFriendship(userId, friendId);
        this.clearCache();
    }

    /**
     * Clears the local cache for the user's friends list.
     */
    public clearCache(): void {
        this._friendsCache = null;
    }
}
