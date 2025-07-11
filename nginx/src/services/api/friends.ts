/**
 * Friendship object.
 * @property `friend_id` - The ID of the friend user
 * @property `created_at` - The date and time when the friendship was created
 */
export interface Friendship {
	friend_id: number;
	created_at: string;
}

/**
 * Friends service API.
 */
export default class FriendsServiceAPI {
	private _host: string = `${window.location.protocol}//${window.location.host}`;
	private _friendsBaseUrl: string = `${this._host}/friends`;

	/**
	 * Create a friendship between two users
	 * @param userId - The ID of the user creating the friendship
	 * @param friendId - The ID of the user to befriend
	 * @returns A promise that resolves when the friendship is created
	 */
	async createFriendship(userId: number, friendId: number): Promise<void> {
		const response = await fetch(`${this._friendsBaseUrl}/${userId}/${friendId}`, {
			method: "POST"
		});
		if (response.status !== 201) {
			const responseData = await response.json();
			throw new Error(`Failed to create friendship:\n${JSON.stringify(responseData, null, 2)}`);
		}
	}

	/**
	 * Get all friendships for a user
	 * @param userId - The ID of the user
	 * @returns A promise that resolves to an array of friendships
	 */
	async getUserFriendships(userId: number): Promise<Friendship[]> {
		const response = await fetch(`${this._friendsBaseUrl}/${userId}`, {
			method: "GET"
		});
		if (response.status === 404) {
			return []; // No friendships found
		}
		if (response.status !== 200) {
			const responseData = await response.json();
			throw new Error(`Failed to get friendships:\n${JSON.stringify(responseData, null, 2)}`);
		}
		return await response.json();
	}

	/**
	 * Delete a friendship between two users
	 * @param userId - The ID of the user removing the friendship
	 * @param friendId - The ID of the friend to remove
	 * @returns A promise that resolves when the friendship is deleted
	 */
	async deleteFriendship(userId: number, friendId: number): Promise<void> {
		const response = await fetch(`${this._friendsBaseUrl}/${userId}/${friendId}`, {
			method: "DELETE"
		});
		if (response.status !== 204) {
			const responseData = await response.json();
			throw new Error(`Failed to delete friendship:\n${JSON.stringify(responseData, null, 2)}`);
		}
	}
}
