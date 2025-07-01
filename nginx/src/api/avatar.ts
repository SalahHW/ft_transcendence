/**
 * Avatar object.
 * @property `id` - The avatar's ID
 * @property `userId` - The ID of the user associated with the avatar
 * @property `url` - The URL of the avatar image
 * @property `createdAt` - The date the avatar was created
 */
export interface Avatar {
	id?: number;
	userId?: number;
	url?: string;
	createdAt?: Date;
}

/**
 * Avatar service API.
 */
export default class AvatarServiceAPI {
	private _host: string = "https://elsalmajori.games";
	private _port: number = 8443;

	/**
	 * Retrieve a user avatar by user ID
	 * @param userId - The ID of the user
	 * @returns A promise that resolves to the avatar
	 */
	async retrieveUserAvatar(userId: number): Promise<Avatar> {
		const response = await fetch(`${this._host}:${this._port}/avatars/retrieve/${userId}`, {
			method: "GET"
		});
		if (response.status !== 200) {
			throw new Error(`Failed to retrieve avatar: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Upload a new avatar for a user
	 * @param userId - The ID of the user
	 * @param avatar - The avatar object to upload
	 * @returns A promise that resolves to the uploaded avatar
	 */
	async uploadUserAvatar(userId: number, avatar: Avatar): Promise<Avatar> {
		const response = await fetch(`${this._host}:${this._port}/avatars/upload/${userId}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(avatar)
		});
		if (response.status !== 201) {
			throw new Error(`Failed to upload avatar: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Update a user avatar by user ID
	 * @param userId - The ID of the user
	 * @param avatar - The updated avatar object
	 * @returns A promise that resolves to the updated avatar
	 */
	async updateUserAvatar(userId: number, avatar: Avatar): Promise<Avatar> {
		const response = await fetch(`${this._host}:${this._port}/avatars/update/${userId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(avatar)
		});
		if (response.status !== 200) {
			throw new Error(`Failed to update avatar: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Delete a user avatar by user ID
	 * @param userId - The ID of the user
	 * @returns A promise that resolves when the avatar is deleted
	 */
	async deleteUserAvatar(userId: number): Promise<void> {
		const response = await fetch(`${this._host}:${this._port}/avatars/delete/${userId}`, {
			method: "DELETE"
		});
		if (response.status !== 204) {
			const responseData = await response.json();
			throw new Error(`Failed to delete avatar:\n${JSON.stringify(responseData, null, 2)}`);
		}
	}
}
