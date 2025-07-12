import AuthNanoService from '../auth/AuthNanoService.js';
import AvatarServiceAPI from './api/avatar.js';

/**
 * Service to manage the current user's avatar, including caching.
 */
export default class AvatarService {
    private static _instance: AvatarService;
    private _authService = AuthNanoService.getInstance();
    private _avatarApi = new AvatarServiceAPI();
    private _avatarUrlCache: string | null = null;
    private _defaultAvatarUrl: string = '/assets/defaultAvatar.jpg';

    private constructor() {}

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
        this.clearCache();
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
        this.clearCache();
    }

    /**
     * Deletes the current user's avatar.
     * After deleting, the local cache is cleared.
     * @returns A promise that resolves when the avatar is deleted.
     */
    public async deleteCurrentUserAvatar(): Promise<void> {
        const userId = await this._getUserId();
        await this._avatarApi.deleteUserAvatar(userId);
        this.clearCache();
    }

    /**
     * Clears the local cache for the avatar URL.
     */
    public clearCache(): void {
        this._avatarUrlCache = null;
    }
}
