import AuthService from './AuthNanoService.js';
import AvatarServiceAPI from './api/avatar.js';
import CacheManager, { CacheableService } from './CacheManager.js';

/**
 * Service to manage the current user's avatar, including caching.
 */
export default class AvatarService implements CacheableService {
    private static _instance: AvatarService;
    private _authService = AuthService.getInstance();
    private _avatarApi = new AvatarServiceAPI();
    private _avatarCache: Map<number, string> = new Map();
    private _defaultAvatarUrl: string = '/assets/defaultAvatar.jpg';
    public readonly serviceName = 'AvatarService';

    private constructor() {
        const cacheManager = CacheManager.getInstance();
        cacheManager.registerService(this, [
            'USER_LOGIN',
            'USER_LOGOUT',
            'AVATAR_UPDATED'
        ]);
    }

    public static getInstance(): AvatarService {
        if (!AvatarService._instance) {
            AvatarService._instance = new AvatarService();
        }
        return AvatarService._instance;
    }

    private async _getUserId(): Promise<number> {
        const jwtPayload = await this._authService.getJwtPayload();
        if (!jwtPayload?.sub) {
            throw new Error("User not authenticated or user ID is missing.");
        }
        return jwtPayload.sub;
    }

    /**
     * Gets the current user's avatar URL.
     * Implements a simple cache-on-read strategy.
     * If the user has no avatar, it returns a default avatar URL.
     * @returns A promise that resolves to the avatar URL.
     */
    public async getCurrentUserAvatarUrl(): Promise<string> {
        const userId = await this._getUserId();
        return this.getAvatarUrlForUser(userId);
    }

    /**
     * Gets a user's avatar URL by their ID, with caching and cache-busting.
     * @param userId - The ID of the user.
     * @returns A promise that resolves to the avatar URL.
     */
    public async getAvatarUrlForUser(userId: number): Promise<string> {
        if (this._avatarCache.has(userId)) {
            const cachedUrl = this._avatarCache.get(userId)!;
            return this._addCacheBusting(cachedUrl);
        }

        try {
            const avatarUrl = await this._avatarApi.getUserAvatarUrl(userId);
            this._avatarCache.set(userId, avatarUrl);
            return this._addCacheBusting(avatarUrl);
        } catch (error) {
            console.warn(`Could not retrieve avatar for user ${userId}. Using default avatar.`, error);
            return this._defaultAvatarUrl;
        }
    }

    /**
     * Adds cache-busting parameter to an avatar URL
     * @param url - The base avatar URL
     * @returns The URL with cache-busting parameter
     */
    private _addCacheBusting(url: string): string {
        if (url === this._defaultAvatarUrl) {
        }
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}t=${Date.now()}`;
    }

    /**
     * Uploads a new avatar for the current user.
     * After uploading, the local cache is cleared.
     * @param file - The File or Blob to upload.
     * @returns A promise that resolves when the upload is successful.
     */
    public async uploadCurrentUserAvatar(file: File | Blob): Promise<void> {
        await this._avatarApi.uploadUserAvatar(file);

        const cacheManager = CacheManager.getInstance();
        cacheManager.triggerEvent({
            type: 'AVATAR_UPDATED',
        });
    }

    /**
     * Updates the current user's avatar.
     * After updating, the local cache is cleared.
     * @param file - The new File or Blob to upload.
     * @returns A promise that resolves when the update is successful.
     */
    public async updateCurrentUserAvatar(file: File | Blob): Promise<void> {
        const userId = await this._getUserId();
        await this._avatarApi.updateUserAvatar(file);

        const cacheManager = CacheManager.getInstance();
        cacheManager.triggerEvent({
            type: 'AVATAR_UPDATED',
            data: { userId }
        });
    }

    /**
     * Uploads a new avatar or updates an existing one for the current user.
     * It checks if an avatar exists and calls the appropriate API method.
     * @param file - The new File or Blob to upload.
     */
    public async uploadOrUpdateCurrentUserAvatar(file: File | Blob): Promise<void> {
        const userId = await this._getUserId();
        const cacheManager = CacheManager.getInstance();
        cacheManager.triggerEvent({
            type: 'AVATAR_UPDATED',
        });
        try {
            await this._avatarApi.getUserAvatarUrl(userId);
            await this._avatarApi.updateUserAvatar(file);
        } catch (error) {
            await this._avatarApi.uploadUserAvatar(file);
        }
    }

    /**
     * Deletes the current user's avatar.
     * After deleting, the local cache is cleared.
     * @returns A promise that resolves when the avatar is deleted.
     */
    public async deleteCurrentUserAvatar(): Promise<void> {
        await this._avatarApi.deleteUserAvatar();

        const cacheManager = CacheManager.getInstance();
        cacheManager.triggerEvent({
            type: 'AVATAR_UPDATED',
        });
    }

    /**
     * Clears the local cache for all avatar URLs.
     */
    public clearCache(): void {
        this._avatarCache.clear();
        console.log("Avatar cache cleared.");
    }
}
