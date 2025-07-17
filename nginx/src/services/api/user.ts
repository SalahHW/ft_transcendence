/**
 * Authentication method for user
 */
export enum AuthenticationMethod {
  CREDENTIALS = "credentials",
  WALLET = "wallet",
}

/**
 * JWT User payload - the user data inside the JWT token
 */
export interface JwtUserPayload {
  sub: number;
  username: string;
  role: string;
  aud: string;
  iss: string;
  iat: number;
  exp: number;
}

/**
 * JWT response from /me endpoint
 */
export interface JwtResponse {
  user: JwtUserPayload;
}

/**
 * User object.
 * @property `id` - The user's ID
 * @property `username` - The user's username
 * @property `email` - The user's email (nullable for wallet authentication)
 * @property `password` - The user's password (nullable for wallet authentication)
 * @property `wallet` - The user's wallet address
 * @property `authenticationMethod` - The authentication method used
 * @property `createdAt` - The date and time the user was created
 * @property `matchesId` - The IDs of the matches the user has played (not match objects avoid surcharge. Use `MatchServiceAPI` to get match objects)
 */
export interface User {
  id?: number;
  username?: string;
  email?: string | null;
  password?: string | null;
  wallet?: string;
  authenticationMethod?: AuthenticationMethod;
}

/**
 * User service API.
 */
export default class UsersApi {
  private _host: string = `${window.location.protocol}//${window.location.host}`;
  private _userPath: string = "/users";
  private _mePath: string = "/me";
  private _loginPath: string = "/login";
  private _registerPath: string = "/register";
  private _logoutPath: string = "/logout";
  private _usersBaseUrl: string = `${this._host}${this._userPath}`;

  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${this._usersBaseUrl}`, {
      method: "GET",
    });
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Failed to fetch users: ${response.status} ${response.statusText}`, responseText);
      throw new Error("Failed to fetch users. Please try again later.");
    }
    const responseData = await response.json();
    console.log("Successfully fetched all users.");
    return responseData;
  }

  /**
   * Creates a new user
   * @param user - The user object to create
   * @returns A promise that resolves to the created user
   */
  async createUser(user: User): Promise<User> {
    const response = await fetch(`${this._usersBaseUrl}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    const responseData = await response.json();
    if (response.ok) {
      console.log("User created successfully:", responseData);
      return responseData;
    }
    else {
      console.error("Failed to create user:", responseData);
      throw new Error("Failed to create user. Please try again later.");
    }
  }

  /**
   * Gets the current user JWT payload
   * @returns A promise that resolves to the JWT user payload
   * @returns `null` if the user is not logged in
   */
  async getCurrentUser(): Promise<JwtUserPayload | null> {
    const response = await fetch(`${this._host}${this._mePath}`, {
      method: "GET",
      credentials: "include",
    });
    if (response.status === 404 || response.status === 401) {
      console.log("No current user logged in.");
      return null;
    }
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Failed to get current user: ${response.status} ${response.statusText}`, responseText);
      throw new Error("Failed to get current user. Please try again later.");
    }
    const responseData: JwtResponse = await response.json();
    console.log("Successfully retrieved current user.");
    return responseData.user;
  }

  /**
   * Gets a user by ID
   * @param id - The ID of the user to get
   * @returns A promise that resolves to the user
   */
  async getUserById(id: number): Promise<User | null> {
    const response = await fetch(`${this._usersBaseUrl}/id/${id}`, {
      method: "GET",
    });
    if (response.status === 404) {
      console.log(`User with id ${id} not found.`);
      return null;
    }
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Failed to get user by id ${id}: ${response.status} ${response.statusText}`, responseText);
      throw new Error("Failed to get user. Please try again later.");
    }
    const responseData = await response.json();
    console.log(`Successfully retrieved user with id ${id}.`);
    return responseData;
  }

  /**
   * Updates a user's username by ID
   * @param id - The ID of the user to update
   * @param username - The new username
   * @returns A promise that resolves to the updated user
   */
  async updateUsernameById(id: number, username: string): Promise<User> {
    const response = await fetch(`${this._usersBaseUrl}/${id}/username`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const responseData = await response.json();
    if (response.ok) {
      console.log(`Username for user ${id} updated successfully.`);
      return responseData;
    } else {
      console.error(`Failed to update username for user ${id}:`, responseData);
      throw new Error("Failed to update username. Please try again later.");
    }
  }

  /**
   * Updates a user's email by ID
   * @param id - The ID of the user to update
   * @param email - The new email
   * @returns A promise that resolves to the updated user
   */
  async updateEmailById(id: number, email: string): Promise<User> {
    const response = await fetch(`${this._usersBaseUrl}/${id}/email`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const responseData = await response.json();
    if (response.ok) {
      console.log(`Email for user ${id} updated successfully.`);
      return responseData;
    } else {
      console.error(`Failed to update email for user ${id}:`, responseData);
      throw new Error("Failed to update email. Please try again later.");
    }
  }

  /**
   * Updates a user's username
   * @param username - The new username
   * @returns A promise that resolves to the updated user
   */
  async updateUsername(username: string): Promise<User> {
    const response = await fetch(`${this._usersBaseUrl}/username`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const responseData = await response.json();
    if (response.ok) {
      console.log("Username updated successfully.");
      return responseData;
    } else {
      console.error("Failed to update username:", responseData);
      throw new Error("Failed to update username. Please try again later.");
    }
  }

  /**
   * Updates a user's email
   * @param email - The new email
   * @returns A promise that resolves to the updated user
   */
  async updateEmail(email: string): Promise<User> {
    const response = await fetch(`${this._usersBaseUrl}/email`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const responseData = await response.json();
    if (response.ok) {
      console.log("Email updated successfully.");
      return responseData;
    } else {
      console.error("Failed to update email:", responseData);
      throw new Error("Failed to update email. Please try again later.");
    }
  }

  /**
   * Deletes a user by ID
   * @param id - The ID of the user to delete
   * @returns A promise that resolves when the user is deleted
   */
  async deleteUser(id: number): Promise<void> {
    const response = await fetch(`${this._usersBaseUrl}/${id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      console.log(`User with id ${id} deleted successfully.`);
      return;
    } else {
      const responseText = await response.text();
      console.error(`Failed to delete user ${id}: ${response.status} ${response.statusText}`, responseText);
      throw new Error("Failed to delete user. Please try again later.");
    }
  }

  /**
   * Gets users by username
   * @param username - The username of the users to get
   * @returns A promise that resolves to the users
   */
  async getUserByUsername(username: string): Promise<User> {
    const response = await fetch(`${this._usersBaseUrl}/username/${username}`, {
      method: "GET",
    });
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Failed to get user by username ${username}: ${response.status} ${response.statusText}`, responseText);
      throw new Error("Failed to get user. Please try again later.");
    }
    const responseData = await response.json();
    console.log(`Successfully retrieved user ${username}.`);
    return responseData;
  }

  /**
   * Gets a user by wallet address
   * @param wallet - The wallet address of the user to get
   * @returns A promise that resolves to the user
   */
  async getUserByWallet(wallet: string): Promise<User> {
    const response = await fetch(`${this._usersBaseUrl}/wallet/${wallet}`, {
      method: "GET",
    });
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Failed to get user by wallet ${wallet}: ${response.status} ${response.statusText}`, responseText);
      throw new Error("Failed to get user by wallet. Please try again later.");
    }
    const responseData = await response.json();
    console.log(`Successfully retrieved user with wallet ${wallet}.`);
    return responseData;
  }

  /**
   * Logs in a user
   * @param username - The username of the user to login
   * @param password - The password of the user to login
   * @returns A promise that resolves when login is successful
   */
  async login(username: string, password: string): Promise<void> {
    const response = await fetch(`${this._host}${this._loginPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Login failed for user ${username}: ${response.status} ${response.statusText}`, responseText);
      throw new Error("Login failed. Please check your credentials and try again.");
    }
    console.log(`User ${username} logged in successfully.`);
  }

  /**
   * Logs out the current user
   * @returns A promise that resolves when logout is successful
   */
  async logout(): Promise<void> {
    const response = await fetch(`${this._host}${this._logoutPath}`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Logout failed: ${response.status} ${response.statusText}`, responseText);
      throw new Error("Logout failed. Please try again later.");
    }
    console.log("User logged out successfully.");
  }

  /**
   * Registers a new user with credentials
   * @param username - The username of the user to register
   * @param email - The email of the user to register
   * @param password - The password of the user to register
   * @param wallet - The wallet address of the user (required)
   * @returns A promise that resolves to the registered user
   */
  async register(
    username: string,
    email: string,
    password: string,
    wallet: string
  ): Promise<User> {
    const response = await fetch(`${this._host}${this._registerPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username,
        email,
        password,
        authenticationMethod: "credentials",
        wallet,
      }),
    });
    const responseData = await response.json();
    if (response.ok) {
      console.log("User registered successfully:", responseData);
      return responseData;
    }
    else {
      console.error("Failed to register user:", responseData);
      throw new Error("Registration failed. Please try again later.");
    }
  }

  /**
   * Registers a new user with wallet
   * @param username - The username of the user to register
   * @param wallet - The wallet address of the user
   * @param signature - The signature from the wallet
   * @param timestamp - The timestamp of the challenge
   * @returns A promise that resolves to the registered user
   */
  async registerWithWallet(
    username: string,
    wallet: string,
    signature: string,
    timestamp: string
  ): Promise<User> {
    const response = await fetch(`${this._host}/register/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, wallet, signature, timestamp }),
    });
    const responseData = await response.json();
    if (response.ok) {
      console.log("User registered with wallet successfully:", responseData);
      return responseData;
    }
    else {
      console.error("Failed to register with wallet:", responseData);
      throw new Error("Registration with wallet failed. Please try again later.");
    }
  }

  /**
   * Logs in a user with wallet
   * @param wallet - The wallet address of the user
   * @param signature - The signature from the wallet
   * @param timestamp - The timestamp of the challenge
   * @returns A promise that resolves when login is successful
   */
  async loginWithWallet(
    wallet: string,
    signature: string,
    timestamp: string
  ): Promise<void> {
    const response = await fetch(`${this._host}/login/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ wallet, signature, timestamp }),
    });
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Login with wallet failed for wallet ${wallet}: ${response.status} ${response.statusText}`, responseText);
      throw new Error("Login with wallet failed. Please try again later.");
    }
    console.log(`User with wallet ${wallet} logged in successfully.`);
  }

  /**
   * Gets a challenge for wallet authentication
   * @param wallet - The wallet address
   * @returns A promise that resolves to the challenge data
   */
  async getWalletChallenge(
    wallet: string
  ): Promise<{ challenge: string; timestamp: string }> {
    const response = await fetch(
      `${this._host}/wallet/challenge?wallet=${wallet}`,
      {
        method: "GET",
        credentials: "include",
      }
    );
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Failed to get wallet challenge for wallet ${wallet}: ${response.status} ${response.statusText}`, responseText);
      throw new Error("Failed to get wallet challenge. Please try again later.");
    }
    const responseData = await response.json();
    console.log(`Successfully retrieved wallet challenge for wallet ${wallet}.`);
    return responseData;
  }
}
