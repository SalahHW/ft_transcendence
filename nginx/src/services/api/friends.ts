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
	async createFriendship(friendId: number): Promise<void> {
		const response = await fetch(`${this._friendsBaseUrl}/id/${friendId}`, {
			method: "POST"
		});
		if (!response.ok) {
			const responseText = await response.text();
			console.error(`Failed to create friendship with user ${friendId}: ${response.status} ${response.statusText}`, responseText);
			throw new Error("Failed to create friendship. Please try again later.");
		}
		console.log(`Friendship with user ${friendId} created successfully.`);
	}

	/**
	 * Get all friendships for a user
	 * @param userId - The ID of the user
	 * @returns A promise that resolves to an array of friendships
	 */
	async getUserFriendships(): Promise<Friendship[]> {
		const response = await fetch(`${this._friendsBaseUrl}`, {
			method: "GET"
		});
		if (response.status === 404) {
			console.log("No friendships found for the user.");
			return [];
		}
		if (!response.ok) {
			const responseText = await response.text();
			console.error(`Failed to get friendships: ${response.status} ${response.statusText}`, responseText);
			throw new Error("Failed to get friendships. Please try again later.");
		}
		const friendships = await response.json();
		console.log("Successfully retrieved user friendships.");
		return friendships;
	}

	/**
	 * Delete a friendship between two users
	 * @param userId - The ID of the user removing the friendship
	 * @param friendId - The ID of the friend to remove
	 * @returns A promise that resolves when the friendship is deleted
	 */
	async deleteFriendship(friendId: number): Promise<void> {
		const response = await fetch(`${this._friendsBaseUrl}/${friendId}`, {
			method: "DELETE"
		});
		if (!response.ok) {
			const responseText = await response.text();
			console.error(`Failed to delete friendship with user ${friendId}: ${response.status} ${response.statusText}`, responseText);
			throw new Error("Failed to delete friendship. Please try again later.");
		}
		console.log(`Friendship with user ${friendId} deleted successfully.`);
	}
}
