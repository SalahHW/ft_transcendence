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
    private _avatarUrlCache: string | null = null;
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
        if (this._avatarUrlCache) {
            return this._avatarUrlCache;
        }

        const userId = await this._getUserId();

        try {
            const avatarUrl = await this._avatarApi.getUserAvatarUrl(userId);
            this._avatarUrlCache = avatarUrl;
            return avatarUrl;
        } catch (error) {
            console.warn("Could not retrieve user avatar. Using default avatar.", error);
            return this._defaultAvatarUrl;
        }
    }

    /**
     * Uploads a new avatar for the current user.
     * After uploading, the local cache is cleared.
     * @param file - The File or Blob to upload.
     * @returns A promise that resolves when the upload is successful.
     */
    public async uploadCurrentUserAvatar(file: File | Blob): Promise<void> {
        const userId = await this._getUserId();
        await this._avatarApi.uploadUserAvatar(userId, file);

        const cacheManager = CacheManager.getInstance();
        cacheManager.triggerEvent({
            type: 'AVATAR_UPDATED',
            data: { userId }
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
        await this._avatarApi.updateUserAvatar(userId, file);

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
        try {
            await this._avatarApi.getUserAvatarUrl(userId);
            await this._avatarApi.updateUserAvatar(userId, file);
        } catch (error) {
            await this._avatarApi.uploadUserAvatar(userId, file);
        }

        const cacheManager = CacheManager.getInstance();
        cacheManager.triggerEvent({
            type: 'AVATAR_UPDATED',
            data: { userId }
        });
    }

    /**
     * Deletes the current user's avatar.
     * After deleting, the local cache is cleared.
     * @returns A promise that resolves when the avatar is deleted.
     */
    public async deleteCurrentUserAvatar(): Promise<void> {
        const userId = await this._getUserId();
        await this._avatarApi.deleteUserAvatar(userId);

        const cacheManager = CacheManager.getInstance();
        cacheManager.triggerEvent({
            type: 'AVATAR_UPDATED',
            data: { userId }
        });
    }

    /**
     * Clears the local cache for the avatar URL.
     */
    public clearCache(): void {
        this._avatarUrlCache = null;
    }
}
