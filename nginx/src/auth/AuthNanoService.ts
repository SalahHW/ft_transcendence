import UsersApi, { User } from "../services/api/user.js";

export default class AuthNanoService {
  private static _instance: AuthNanoService;
  private _usersApi: UsersApi = new UsersApi();
  private _user: User | null = null;
  private _isLoggedIn: boolean | null = null; // null means we haven't checked yet
  private _refreshInterval: ReturnType<typeof setInterval> | null = null;
  private _host: string = `${window.location.protocol}//${window.location.host}`;

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
        if (this._isLoggedIn) this._startRefreshLoop();
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

  public async getUser(): Promise<User> {
    try {
      await this._ensureAuthStatusChecked();

      if (!this._user || !this._user.id) {
        throw new Error("User not authenticated or missing ID");
      }
      return (await this._usersApi.getUserById(this._user.id));
    } catch (error) {
      console.error("getUser() error:", error);
      throw error;
    }
  }

  public async login(username: string, password: string): Promise<User> {
    await this._usersApi.login(username, password);
    this._user = await this._usersApi.getCurrentUser();
    this._isLoggedIn = true;
    this._startRefreshLoop();
    return this._user!;
  }

  public async logout(): Promise<void> {
    try {
      await this._usersApi.logout();
      this._user = null;
      this._isLoggedIn = false;
      this._stopRefreshLoop();
    } catch (error) {
      console.error("Logout API call failed:", error);
      throw new Error("Logout failed. Please try again.");
    }
  }

  public async register(data: {
    username: string;
    password: string;
    email: string;
    wallet: string;
  }): Promise<User> {
    await this._usersApi.register(data.username, data.email, data.password, data.wallet);
    return this.login(data.username, data.password);
  }

  public async registerWithWallet(username: string): Promise<void> {
    try {
      const wallet = await this._getWalletAddress();
      if (!wallet) throw new Error("No wallet detected");

      const { challenge, timestamp } = await this._usersApi.getWalletChallenge(wallet);
      if (!challenge || !timestamp)
        throw new Error("Invalid challenge response");

      const signature = await this._signMessage(challenge, wallet);

      await this._usersApi.registerWithWallet(username, wallet, signature, timestamp);

      this._user = await this._usersApi.getCurrentUser();
      this._isLoggedIn = true;
      this._startRefreshLoop();
    } catch (error) {
      console.error("registerWithWallet() error:", error);
      throw error;
    }
  }

  private async _getWalletAddress(): Promise<string | null> {
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error("MetaMask not detected");

    const accounts: string[] = await ethereum.request({
      method: "eth_requestAccounts",
    });
    return accounts[0] || null;
  }

  private async _signMessage(
    message: string,
    address: string
  ): Promise<string> {
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error("Ethereum provider not available");

    const signature: string = await ethereum.request({
      method: "personal_sign",
      params: [message, address],
    });
    return signature;
  }

  public async loginWithWallet(): Promise<void> {
    try {
      const wallet = await this._getWalletAddress();
      if (!wallet) throw new Error("No wallet detected");

      const { challenge, timestamp } = await this._usersApi.getWalletChallenge(wallet);
      if (!challenge || !timestamp)
        throw new Error("Invalid challenge response");

      const signature = await this._signMessage(challenge, wallet);

      await this._usersApi.loginWithWallet(wallet, signature, timestamp);

      this._user = await this._usersApi.getCurrentUser();
      this._isLoggedIn = true;
      this._startRefreshLoop();
    } catch (error) {
      console.error("loginWithWallet() error:", error);
      throw error;
    }
  }

  private _startRefreshLoop() {
    if (this._refreshInterval) return;

    this._refreshInterval = setInterval(async () => {
      try {
        const res = await fetch(`${this._host}/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (res.status === 401) {
          console.warn("Token expired. Logging out...");
          await this.logout();
          return;
        }

        if (!res.ok) {
          console.warn(`[REFRESH] Failed with status ${res.status}`);
          return;
        }

        console.info("[REFRESH] Token refreshed successfully");
      } catch (err) {
        console.error(
          "[REFRESH] Network or server error during token refresh:",
          err
        );
      }
    }, 240_000);
  }

  private _stopRefreshLoop() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  }
}
