/**
 * Enum for user roles
*/
export enum UserRole {
	USER = "user",
	ADMIN = "admin",
	MODERATOR = "moderator"
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
	matcheId?: number[];
	createdAt?: Date;
	role?: UserRole;
}

/**
 * User service API.
 */
export default class UsersApi {
	private _baseUrl: string = "http://localhost:3000/api/users";

	async getAllUsers(): Promise<User[]> {
		const response = await fetch(`${this._baseUrl}`, {
			method: "GET",
			headers: {
				"Authorization": `Bearer CONNECTED_USER_TOKEN`,
			}
		});
		if (response.status !== 200) {
			throw new Error(`Failed to fetch users: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Creates a new user
	 * @param user - The user object to create
	 * @returns A promise that resolves to the created user
	 */
	async createUser(user: User): Promise<User> {
		const response = await fetch(`${this._baseUrl}`, {
			method: "POST",
			headers: {
				"Authorization": `Bearer CONNECTED_USER_TOKEN`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(user)
		});
		if (response.status !== 201) {
			throw new Error(`Failed to create user: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Gets the current user
	 * @returns A promise that resolves to the current user
	 */
	async getCurrentUser(): Promise<User> {
		const response = await fetch(`${this._baseUrl}/me`, {
			method: "GET",
			headers: {
				"Authorization": `Bearer CONNECTED_USER_TOKEN`,
			}
		});
		if (response.status !== 200) {
			throw new Error(`Failed to get current user: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Gets a user by ID
	 * @param id - The ID of the user to get
	 * @returns A promise that resolves to the user
	 */
	async getUser(id: number): Promise<User> {
		const response = await fetch(`${this._baseUrl}/${id}`, {
			method: "GET",
			headers: {
				"Authorization": `Bearer CONNECTED_USER_TOKEN`,
			}
		});
		if (response.status !== 200) {
			throw new Error(`Failed to get user: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Updates a user by ID
	 * @param id - The ID of the user to update
	 * @param user - The updated user object
	 * @returns A promise that resolves to the updated user
	 */
	async updateUser(id:number, user: User): Promise<User> {
		const response = await fetch(`${this._baseUrl}/${id}`, {
			method: "PUT",
			headers: {
				"Authorization": `Bearer CONNECTED_USER_TOKEN`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(user)
		});
		if (response.status !== 200) {
			throw new Error(`Failed to update user: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Deletes a user by ID
	 * @param id - The ID of the user to delete
	 * @returns A promise that resolves to the deleted user
	 */
	async deleteUser(id: number): Promise<void> {
		const response = await fetch(`${this._baseUrl}/${id}`, {
			method: "DELETE",
			headers: {
				"Authorization": `Bearer CONNECTED_USER_TOKEN`,
			}
		});
		if (response.status !== 204) {
			throw new Error(`Failed to delete user: ${response.statusText}`);
		}
	}

	/**
	 * Gets users by username
	 * @param username - The username of the users to get
	 * @returns A promise that resolves to the users
	 */
	async getUsersByUsername(username: string): Promise<User[]> {
		const response = await fetch(`${this._baseUrl}/list/username/${username}`, {
			method: "GET",
			headers: {
				"Authorization": `Bearer CONNECTED_USER_TOKEN`,
			}
		});
		if (response.status !== 200) {
			throw new Error(`Failed to get users by username: ${response.statusText}`);
		}
		return response.json();
	}
}
