import UsersApi, { User } from "../api/user.js";

export default class AuthNanoService {
    private static _instance: AuthNanoService;
    private _usersApi: UsersApi = new UsersApi();
    private _user: User | null = null;
    private _isLoggedIn: boolean | null = null; // null means we haven't checked yet

    private constructor() {}

    public static getInstance(): AuthNanoService {
        if (!AuthNanoService._instance) {
            AuthNanoService._instance = new AuthNanoService();
        }
        return AuthNanoService._instance;
    }

    private async _ensureAuthStatusChecked(): Promise<void> {
        if (this._isLoggedIn === null) {
            try {
                this._user = await this._usersApi.getCurrentUser();
                this._isLoggedIn = !!this._user;
            } catch (error) {
                console.error("Failed to check auth status", error);
                this._user = null;
                this._isLoggedIn = false;
            }
        }
    }

    public async isLoggedIn(): Promise<boolean> {
        await this._ensureAuthStatusChecked();
        return this._isLoggedIn!;
    }

    public async getUser(): Promise<User | null> {
        await this._ensureAuthStatusChecked();
        return this._user;
    }

    public async login(username: string, password: string): Promise<User> {
        const user = await this._usersApi.login(username, password);
        this._user = user;
        this._isLoggedIn = true;
        return user;
    }

    public async logout(): Promise<void> {
        try {
            await this._usersApi.logout();
        } catch (error) {
            console.error("Logout API call failed, logging out on client anyway.", error);
        } finally {
            this._user = null;
            this._isLoggedIn = false;
        }
    }

    public async register(username: string, password: string, email: string): Promise<User> {
        await this._usersApi.register(username, password, email);
        // After successful registration, log the user in.
        return this.login(username, password);
    }
}
