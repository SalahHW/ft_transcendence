import UsersApi, { JwtUserPayload } from "../services/api/user.js";
import CacheManager from "./CacheManager.js";

export default class AuthService {
  private static _instance: AuthService;
  private _usersApi: UsersApi = new UsersApi();
  private _user: JwtUserPayload | null = null;
  private _isLoggedIn: boolean | null = null;
  private _refreshInterval: ReturnType<typeof setInterval> | null = null;
  private _host: string = `${window.location.protocol}//${window.location.host}`;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService._instance) {
      AuthService._instance = new AuthService();
    }
    return AuthService._instance;
  }

  public async _ensureAuthStatusChecked(
    forceRefresh: boolean = false
  ): Promise<void> {
    if (this._isLoggedIn === null || forceRefresh) {
      try {
        this._user = await this._usersApi.getCurrentUser();
        this._isLoggedIn = !!this._user;
        if (this._isLoggedIn) {
          this._startRefreshLoop();
        } else {
          this._stopRefreshLoop();
        }
      } catch (error) {
        console.error("Failed to check auth status", error);
        this._user = null;
        this._isLoggedIn = false;
        this._stopRefreshLoop();
      }
    }
  }

  public async isLoggedIn(forceRefresh: boolean = false): Promise<boolean> {
    await this._ensureAuthStatusChecked(forceRefresh);
    return this._isLoggedIn!;
  }

  public async getJwtPayload(
    forceRefresh: boolean = false
  ): Promise<JwtUserPayload | null> {
    await this._ensureAuthStatusChecked(forceRefresh);
    return this._user;
  }

  public async login(
    username: string,
    password: string
  ): Promise<JwtUserPayload> {
    await this._usersApi.login(username, password);
    this._user = await this._usersApi.getCurrentUser();
    this._isLoggedIn = true;
    this._startRefreshLoop();

    const cacheManager = CacheManager.getInstance();
    cacheManager.triggerEvent({
      type: "USER_LOGIN",
      data: { userId: this._user?.sub, username: this._user?.username },
    });

    window.location.reload();
    return this._user!;
  }

  public async logout(): Promise<void> {
    try {
      await this._usersApi.logout();
      this._user = null;
      this._isLoggedIn = false;
      this._stopRefreshLoop();

      const cacheManager = CacheManager.getInstance();
      cacheManager.triggerEvent({
        type: "USER_LOGOUT",
        data: { timestamp: Date.now() },
      });
      window.location.reload();
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
  }): Promise<JwtUserPayload> {
    await this._usersApi.register(
      data.username,
      data.email,
      data.password,
      data.wallet
    );
    await this.login(data.username, data.password);
    return this._user!;
  }

  public async registerWithWallet(username: string): Promise<void> {
    try {
      const wallet = await this._getWalletAddress();
      if (!wallet)
        throw new Error(
          "No wallet account found. Please connect an account in your wallet extension."
        );

      const { challenge, timestamp } = await this._usersApi.getWalletChallenge(
        wallet
      );
      if (!challenge || !timestamp)
        throw new Error("Failed to get a login challenge from the server.");

      const signature = await this._signMessage(challenge, wallet);

      await this._usersApi.registerWithWallet(
        username,
        wallet,
        signature,
        timestamp
      );

      this._user = await this._usersApi.getCurrentUser();
      this._isLoggedIn = true;
      this._startRefreshLoop();

      const cacheManager = CacheManager.getInstance();
      cacheManager.triggerEvent({
        type: "USER_LOGIN",
        data: { userId: this._user?.sub, username: this._user?.username },
      });
    } catch (error) {
      console.error("registerWithWallet() error:", error);
      throw error;
    }
  }

  private async _getWalletAddress(): Promise<string | null> {
    const ethereum = (window as any).ethereum;
    if (!ethereum)
      throw new Error(
        "No wallet extension detected. Please install a wallet extension."
      );

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
    if (!ethereum)
      throw new Error(
        "No wallet extension is available. Please ensure it's installed and enabled."
      );

    try {
      const signature: string = await ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });
      return signature;
    } catch (err: any) {
      if (err.code === 4001) {
        throw new Error("You rejected the signature request in your wallet.");
      }
      console.error("Error signing message:", err);
      throw new Error(
        "An unexpected error occurred while signing the message."
      );
    }
  }

  public async loginWithWallet(): Promise<void> {
    try {
      const wallet = await this._getWalletAddress();
      if (!wallet)
        throw new Error(
          "No wallet account found. Please connect an account in your wallet extension."
        );

      const { challenge, timestamp } = await this._usersApi.getWalletChallenge(
        wallet
      );
      if (!challenge || !timestamp)
        throw new Error("Failed to get a login challenge from the server.");

      const signature = await this._signMessage(challenge, wallet);

      await this._usersApi.loginWithWallet(wallet, signature, timestamp);

      this._user = await this._usersApi.getCurrentUser();
      this._isLoggedIn = true;
      this._startRefreshLoop();

      const cacheManager = CacheManager.getInstance();
      cacheManager.triggerEvent({
        type: "USER_LOGIN",
        data: { userId: this._user?.sub, username: this._user?.username },
      });
    } catch (error) {
      console.error("loginWithWallet() error:", error);
      throw error;
    }
  }

  private _startRefreshLoop() {
    if (this._refreshInterval) return;

    this._refreshInterval = setInterval(async () => {
      try {
        const res = await fetch(`${this._host}/refreshAccessToken`, {
          method: "POST",
          credentials: "include",
        });

        if (res.status === 401) {
          console.warn("Token expired. Logging out...");
          await this.logout();
          return;
        }

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          console.warn(`[REFRESH] Failed with status ${res.status}: ${body}`);
          return;
        }

        console.info("[REFRESH] Access token refreshed successfully");
      } catch (err) {
        console.error(
          "[REFRESH] Network or server error during token refresh:",
          err
        );
      }
    }, 120_000);
  }

  private _stopRefreshLoop() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  }
}
