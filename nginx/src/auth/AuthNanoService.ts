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
      this._user = null;
      this._isLoggedIn = false;
    } catch (error) {
      console.error("Logout API call failed:", error);
      throw new Error("Logout failed. Please try again.");
    }
  }

  public async register(
    username: string,
    password: string,
    email: string
  ): Promise<User> {
    await this._usersApi.register(username, password, email);
    // After successful registration, log the user in.
    return this.login(username, password);
  }

  public async registerWithWallet(username: string): Promise<void> {
    try {
      const wallet = await this._getWalletAddress();
      if (!wallet) throw new Error("No wallet detected");

      //️Récupérer le challenge (et le timestamp)
      const challengeRes = await fetch(
        `https://elsalmajori.games:8443/wallet/challenge?wallet=${wallet}`
      );
      if (!challengeRes.ok) {
        const errorText = await challengeRes.text();
        throw new Error(`Failed to get challenge: ${errorText}`);
      }

      const { challenge, timestamp } = await challengeRes.json();
      if (!challenge || !timestamp)
        throw new Error("Invalid challenge response");

      // Signature du challenge via MetaMask
      const signature = await this._signMessage(challenge, wallet);

      // ️Envoi au backend
      const registerRes = await fetch(
        "https://elsalmajori.games:8443/register/wallet",
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

      // Récupérer le challenge à signer
      const challengeRes = await fetch(
        `https://elsalmajori.games:8443/wallet/challenge?wallet=${wallet}`
      );
      if (!challengeRes.ok) {
        const errorText = await challengeRes.text();
        throw new Error(`Failed to get challenge: ${errorText}`);
      }

      const { challenge, timestamp } = await challengeRes.json();
      if (!challenge || !timestamp)
        throw new Error("Invalid challenge response");

      // Signer le challenge avec MetaMask
      const signature = await this._signMessage(challenge, wallet);

      // Envoyer la signature pour login
      const loginRes = await fetch(
        "https://elsalmajori.games:8443/login/wallet",
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
    } catch (error) {
      console.error("loginWithWallet() error:", error);
      throw error;
    }
  }
}
