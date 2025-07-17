/**
 * Avatar object.
 * @property `id` - The avatar's ID
 * @property `userId` - The ID of the user associated with the avatar
 * @property `avatarName` - The filename of the avatar image
 */
export interface Avatar {
	id?: number;
	userId?: number;
	avatarName?: string;
}

/**
 * Avatar service API.
 */
export default class AvatarServiceAPI {
	private _host: string = `${window.location.protocol}//${window.location.host}`;
	private _avatarsBaseUrl: string = `${this._host}/avatars`;

	/**
	 * Retrieve a user avatar by user ID
	 * @param userId - The ID of the user
	 * @returns A promise that resolves to the avatar URL
	 */
	async getUserAvatarUrl(userId: number): Promise<string> {
		const response = await fetch(`${this._avatarsBaseUrl}/id/${userId}`, {
			method: "GET"
		});
		if (!response.ok) {
			const responseText = await response.text();
			console.error(`Failed to retrieve avatar for user ${userId}: ${response.status} ${response.statusText}`, responseText);
			throw new Error("Could not retrieve avatar. Please try again later.");
		}
		console.log(`Successfully retrieved avatar url for user ${userId}.`);
		return `${this._avatarsBaseUrl}/id/${userId}`;
	}

	/**
	 * Upload a new avatar for a user (multipart/form-data)
	 * @param userId - The ID of the user
	 * @param file - The File or Blob to upload
	 * @returns A promise that resolves when the upload is successful
	 */
	async uploadUserAvatar(file: File | Blob): Promise<void> {
		const formData = new FormData();
		formData.append("file", file);

		const response = await fetch(`${this._avatarsBaseUrl}`, {
			method: "POST",
			body: formData
		});
		if (!response.ok) {
			const responseText = await response.text();
			console.error(`Failed to upload avatar: ${response.status} ${response.statusText}`, responseText);
			throw new Error("Failed to upload avatar. Please try again later.");
		}
		console.log("Avatar uploaded successfully.");
	}

	/**
	 * Update a user avatar by user ID (multipart/form-data)
	 * @param userId - The ID of the user
	 * @param file - The new File or Blob to upload
	 * @returns A promise that resolves when the update is successful
	 */
	async updateUserAvatar(file: File | Blob): Promise<void> {
		const formData = new FormData();
		formData.append("file", file);

		const response = await fetch(`${this._avatarsBaseUrl}`, {
			method: "PUT",
			body: formData
		});
		if (!response.ok) {
			const responseText = await response.text();
			console.error(`Failed to update avatar: ${response.status} ${response.statusText}`, responseText);
			throw new Error("Failed to update avatar. Please try again later.");
		}
		console.log("Avatar updated successfully.");
	}

	/**
	 * Delete a user avatar by user ID
	 * @param userId - The ID of the user
	 * @returns A promise that resolves when the avatar is deleted
	 */
	async deleteUserAvatar(): Promise<void> {
		const response = await fetch(`${this._avatarsBaseUrl}`, {
			method: "DELETE"
		});
		if (!response.ok) {
			const responseText = await response.text();
			console.error(`Failed to delete avatar: ${response.status} ${response.statusText}`, responseText);
			throw new Error("Failed to delete avatar. Please try again later.");
		}
		console.log("Avatar deleted successfully.");
	}
}
