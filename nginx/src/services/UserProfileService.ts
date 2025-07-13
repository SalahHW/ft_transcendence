import AuthNanoService from './AuthNanoService.js';
import UsersApi, { User } from './api/user.js';

/**
 * Service to manage user profile data, including caching.
 */
export default class UserProfileService {
    private static _instance: UserProfileService;
    private _authService = AuthNanoService.getInstance();
    private _usersApi = new UsersApi();
    private _userProfileCache: User | null = null;

    private constructor() {}

    public static getInstance(): UserProfileService {
        if (!UserProfileService._instance) {
            UserProfileService._instance = new UserProfileService();
        }
        return UserProfileService._instance;
    }

    /**
     * Gets the full user profile.
     * Implements a simple cache-on-read strategy.
     * @returns A promise that resolves to the user profile.
     */
    public async getUserProfile(): Promise<User> {
        if (this._userProfileCache) {
            return this._userProfileCache;
        }

        const jwtPayload = await this._authService.getJwtPayload();
        if (!jwtPayload?.sub) {
            throw new Error("User not authenticated or user ID is missing.");
        }

        const userProfile = await this._usersApi.getUserById(jwtPayload.sub);
        this._userProfileCache = userProfile;

        return userProfile;
    }

    /**
     * Updates the user profile on the server and in the local cache.
     * @param updatedData - An object with the user data to update.
     * @returns A promise that resolves to the updated user profile.
     */
    public async updateUserProfile(updatedData: Partial<User>): Promise<User> {
        const jwtPayload = await this._authService.getJwtPayload();
        if (!jwtPayload?.sub) {
            throw new Error("User not authenticated or user ID is missing.");
        }

        const updatedUser = await this._usersApi.updateUser(jwtPayload.sub, updatedData);

        // Update the cache with the new, complete data from the server response
        this._userProfileCache = updatedUser;

        return updatedUser;
    }

    /**
     * Clears the local cache for the user profile.
     */
    public clearCache(): void {
        this._userProfileCache = null;
    }
}
