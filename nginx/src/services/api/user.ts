/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   user.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:41:03 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/12 16:59:20 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Authentication method for user
 */
export enum AuthenticationMethod {
  CREDENTIALS = "credentials",
  WALLET = "wallet",
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
  matchesId?: number[];
  createdAt?: Date;
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
    const responseData = await response.json();
    if (response.status === 200) return responseData;
    else
      throw new Error(
        `failed to fetch users:\n${JSON.stringify(responseData, null, 2)}`
      );
  }

  /**
   * Creates a new user
   * @param user - The user object to create
   * @returns A promise that resolves to the created user
   */
  async createUser(user: User): Promise<User> {
    const response = await fetch(`${this._usersBaseUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    });
    const responseData = await response.json();
    if (response.status === 201) return responseData;
    else
      throw new Error(
        `failed to create user:\n${JSON.stringify(responseData, null, 2)}`
      );
  }

  /**
   * Gets the current user
   * @returns A promise that resolves to the current user
   * @returns `null` if the user is not logged in
   */
  async getCurrentUser(): Promise<User | null> {
    const response = await fetch(`${this._host}${this._mePath}`, {
      method: "GET",
    });
    if (response.status === 404 || response.status === 401) return null;
    const responseData = await response.json();
    if (response.status === 200) return responseData.user;
    else
      throw new Error(
        `failed to get current user:\n${JSON.stringify(responseData, null, 2)}`
      );
  }

  /**
   * Gets a user by ID
   * @param id - The ID of the user to get
   * @returns A promise that resolves to the user
   */
  async getUserById(id: number): Promise<User> {
    const response = await fetch(`${this._usersBaseUrl}/id/${id}`, {
      method: "GET",
    });
    const responseData = await response.json();
    if (response.status === 200) return responseData;
    else
      throw new Error(
        `failed to get user:\n${JSON.stringify(responseData, null, 2)}`
      );
  }

  /**
   * Updates a user by ID
   * @param id - The ID of the user to update
   * @param user - The updated user object
   * @returns A promise that resolves to the updated user
   */
  async updateUser(id: number, user: User): Promise<User> {
    const response = await fetch(`${this._usersBaseUrl}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    });
    const responseData = await response.json();
    if (response.status === 200) return responseData;
    else
      throw new Error(
        `failed to update user:\n${JSON.stringify(responseData, null, 2)}`
      );
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
    const responseData = await response.json();
    if (response.status === 200 && responseData.success) return;
    else
      throw new Error(
        `failed to delete user:\n${JSON.stringify(responseData, null, 2)}`
      );
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
    const responseData = await response.json();
    if (response.status === 200) return responseData;
    else
      throw new Error(
        `failed to get users by username:\n${JSON.stringify(
          responseData,
          null,
          2
        )}`
      );
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
    const responseData = await response.json();
    if (response.status === 200)
      return;
    else
      throw new Error(
        `failed to login:\n${JSON.stringify(responseData, null, 2)}`
      );
  }

  /**
   * Logs out the current user
   * @returns A promise that resolves when logout is successful
   */
  async logout(): Promise<void> {
    const response = await fetch(`${this._host}${this._logoutPath}`, {
      method: "POST",
    });
    const responseData = await response.json();
    if (response.status === 200) return;
    else {
      throw new Error(
        `failed to logout:\n${JSON.stringify(responseData, null, 2)}`
      );
    }
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        password,
        authenticationMethod: "credentials",
        wallet,
      }),
    });
    const responseData = await response.json();
    if (response.status === 201) return responseData;
    else
      throw new Error(
        `failed to register:\n${JSON.stringify(responseData, null, 2)}`
      );
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        wallet,
        signature,
        timestamp,
      }),
    });
    const responseData = await response.json();
    if (response.status === 201) return responseData;
    else
      throw new Error(
        `failed to register with wallet:\n${JSON.stringify(responseData, null, 2)}`
      );
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        wallet,
        signature,
        timestamp,
      }),
    });
    const responseData = await response.json();
    if (response.status === 200) return;
    else
      throw new Error(
        `failed to login with wallet:\n${JSON.stringify(responseData, null, 2)}`
      );
  }

  /**
   * Gets a challenge for wallet authentication
   * @param wallet - The wallet address
   * @returns A promise that resolves to the challenge data
   */
  async getWalletChallenge(wallet: string): Promise<{ challenge: string; timestamp: string }> {
    const response = await fetch(`${this._host}/wallet/challenge?wallet=${wallet}`, {
      method: "GET",
    });
    const responseData = await response.json();
    if (response.status === 200) return responseData;
    else
      throw new Error(
        `failed to get wallet challenge:\n${JSON.stringify(responseData, null, 2)}`
      );
  }
}
