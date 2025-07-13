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
		if (response.status !== 200) {
			const responseText = await response.text();
			try {
				const responseData = JSON.parse(responseText);
				throw new Error(`Failed to retrieve avatar:\n${JSON.stringify(responseData, null, 2)}`);
			} catch (jsonError) {
				throw new Error(`Failed to retrieve avatar: ${response.status} ${response.statusText}. Response: ${responseText}`);
			}
		}
		return `${this._avatarsBaseUrl}/id/${userId}`;
	}

	/**
	 * Upload a new avatar for a user (multipart/form-data)
	 * @param userId - The ID of the user
	 * @param file - The File or Blob to upload
	 * @returns A promise that resolves when the upload is successful
	 */
	async uploadUserAvatar(userId: number, file: File | Blob): Promise<void> {
		const formData = new FormData();
		formData.append("file", file);

		const response = await fetch(`${this._avatarsBaseUrl}/id/${userId}`, {
			method: "POST",
			body: formData
		});
		if (response.status !== 201) {
			const responseText = await response.text();
			try {
				const responseData = JSON.parse(responseText);
				throw new Error(`Failed to upload avatar:\n${JSON.stringify(responseData, null, 2)}`);
			} catch (jsonError) {
				throw new Error(`Failed to upload avatar: ${response.status} ${response.statusText}. Response: ${responseText}`);
			}
		}
	}

	/**
	 * Update a user avatar by user ID (multipart/form-data)
	 * @param userId - The ID of the user
	 * @param file - The new File or Blob to upload
	 * @returns A promise that resolves when the update is successful
	 */
	async updateUserAvatar(userId: number, file: File | Blob): Promise<void> {
		const formData = new FormData();
		formData.append("file", file);

		const response = await fetch(`${this._avatarsBaseUrl}/id/${userId}`, {
			method: "PUT",
			body: formData
		});
		if (response.status !== 200) {
			const responseText = await response.text();
			try {
				const responseData = JSON.parse(responseText);
				throw new Error(`Failed to update avatar:\n${JSON.stringify(responseData, null, 2)}`);
			} catch (jsonError) {
				throw new Error(`Failed to update avatar: ${response.status} ${response.statusText}. Response: ${responseText}`);
			}
		}
	}

	/**
	 * Delete a user avatar by user ID
	 * @param userId - The ID of the user
	 * @returns A promise that resolves when the avatar is deleted
	 */
	async deleteUserAvatar(userId: number): Promise<void> {
		const response = await fetch(`${this._avatarsBaseUrl}/id/${userId}`, {
			method: "DELETE"
		});
		if (response.status !== 200) {
			const responseText = await response.text();
			try {
				const responseData = JSON.parse(responseText);
				throw new Error(`Failed to delete avatar:\n${JSON.stringify(responseData, null, 2)}`);
			} catch (jsonError) {
				throw new Error(`Failed to delete avatar: ${response.status} ${response.statusText}. Response: ${responseText}`);
			}
		}
	}
}
