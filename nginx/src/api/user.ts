/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   user.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:41:03 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/23 15:11:16 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Enum for user roles
 */
export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  MODERATOR = "moderator",
}

/**
 * User object.
 * @property `id` - The user's ID
 * @property `username` - The user's username
 * @property `email` - The user's email
 * @property `createdAt` - The date and time the user was created
 * @property `role` - Permission level of the user
 * @property `matchesId` - The IDs of the matches the user has played (not match objects avoid surcharge. Use `MatchServiceAPI` to get match objects)
 */
export interface User {
  id?: number;
  username?: string;
  email?: string;
  password?: string;
  matcheId?: number[];
  createdAt?: Date;
  role?: UserRole;
}

/**
 * User service API.
 */
export default class UsersApi {
  private _host: string = "https://elsalmajori.games:8443";
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
    if (response.status === 404) return null;
    const responseData = await response.json();
    if (response.status === 200) return responseData;
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
   * @returns A promise that resolves to the deleted user
   */
  async deleteUser(id: number): Promise<void> {
    const response = await fetch(`${this._usersBaseUrl}/${id}`, {
      method: "DELETE",
    });
    const responseData = await response.json();
    if (response.status === 204) return;
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
  async getUsersByUsername(username: string): Promise<User[]> {
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
   * @returns A promise that resolves to the logged in user
   */
  async login(username: string, password: string): Promise<User> {
    const response = await fetch(`${this._host}${this._loginPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
    const responseData = await response.json();
    if (response.status === 200) return responseData;
    else
      throw new Error(
        `failed to login:\n${JSON.stringify(responseData, null, 2)}`
      );
  }

  /**
   * Logs out the current user
   * @returns A promise that resolves to the logged out user
   */
  async logout(): Promise<void> {
    const response = await fetch(`${this._host}${this._logoutPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.status === 200) return;
    else {
      const responseData = await response.json();
      throw new Error(
        `failed to logout:\n${JSON.stringify(responseData, null, 2)}`
      );
    }
  }

  /**
   * Registers a new user
   * @param username - The username of the user to register
   * @param password - The password of the user to register
   * @param email - The email of the user to register
   * @returns A promise that resolves to the registered user
   */
  async register(
    username: string,
    email: string,
    password: string,
    authenticationMethod: string,
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
        authenticationMethod,
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
}
