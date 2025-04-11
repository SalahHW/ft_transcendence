interface User {
	id: number;
	username: string;
	email: string;
	created_at: string;
}

export default class UserServiceAPI {
	private _baseUrl: string = "http://localhost:3000/users";

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
		console.log(`Users fetched: ${response.json()}`);
		return response.json();
	}

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
		console.log(`User created: ${response.json()}`);
		return response.json();
	}

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
		console.log(`Current user: ${response.json()}`);
		return response.json();
	}

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
		console.log(`User fetched: ${response.json()}`);
		return response.json();
	}

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
		console.log(`User updated: ${response.json()}`);
		return response.json();
	}

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
		console.log(`User deleted: ${response.status}`);
	}

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
		console.log(`Users fetched by username: ${response.json()}`);
		return response.json();
	}
}

