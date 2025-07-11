import UsersApi, { User } from "../services/api/user.js";

export default class AuthNanoService {
  private static _instance: AuthNanoService;
  private _usersApi: UsersApi = new UsersApi();
  private _user: User | null = null;
  private _isLoggedIn: boolean | null = null; // null means we haven't checked yet
  private _refreshInterval: ReturnType<typeof setInterval> | null = null;

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

  public async getUser(): Promise<User | null> {
    await this._ensureAuthStatusChecked();
    return this._user;
  }

  public async login(username: string, password: string): Promise<User> {
    const user = await this._usersApi.login(username, password);
    this._user = user;
    this._isLoggedIn = true;
    this._startRefreshLoop();
    return user;
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
    authenticationMethod: string;
    wallet: string;
  }): Promise<User> {
    const response = await fetch(`${process.env.API_BASE_URL!}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage =
        errorBody?.error || `Failed to register: ${response.statusText}`;
      const error: any = new Error(errorMessage);
      error.response = response;
      throw error;
    }

    return this.login(data.username, data.password);
  }

  public async registerWithWallet(username: string): Promise<void> {
    try {
      const wallet = await this._getWalletAddress();
      if (!wallet) throw new Error("No wallet detected");

      const challengeRes = await fetch(
        `${process.env.API_BASE_URL!}/wallet/challenge?wallet=${wallet}`
      );
      if (!challengeRes.ok) {
        const errorText = await challengeRes.text();
        throw new Error(`Failed to get challenge: ${errorText}`);
      }

      const { challenge, timestamp } = await challengeRes.json();
      if (!challenge || !timestamp)
        throw new Error("Invalid challenge response");

      const signature = await this._signMessage(challenge, wallet);

      const registerRes = await fetch(
        `${process.env.API_BASE_URL!}/register/wallet`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet,
            username,
            signature,
            timestamp,
          }),
        }
      );

      if (!registerRes.ok) {
        const errorText = await registerRes.text();
        throw new Error(`Wallet registration failed: ${errorText}`);
      }

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

      const challengeRes = await fetch(
        `${process.env.API_BASE_URL!}/wallet/challenge?wallet=${wallet}`
      );
      if (!challengeRes.ok) {
        const errorText = await challengeRes.text();
        throw new Error(`Failed to get challenge: ${errorText}`);
      }

      const { challenge, timestamp } = await challengeRes.json();
      if (!challenge || !timestamp)
        throw new Error("Invalid challenge response");

      const signature = await this._signMessage(challenge, wallet);

      const loginRes = await fetch(
        `${process.env.API_BASE_URL!}/login/wallet`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet,
            signature,
            timestamp,
          }),
        }
      );

      if (!loginRes.ok) {
        const errorText = await loginRes.text();
        throw new Error(`Wallet login failed: ${errorText}`);
      }

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
        const res = await fetch(`${process.env.API_BASE_URL!}/refresh`, {
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
