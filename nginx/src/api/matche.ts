/**
 * Match object.
 * @property `id` - The match's ID
 * @property `userId1` - The ID of the first user (not user object avoid surcharge. Use `UserServiceAPI` to get user object)
 * @property `userId2` - The ID of the second user (not user object avoid surcharge. Use `UserServiceAPI` to get user object)
 * @property `userScore1` - The score of the first user
 * @property `userScore2` - The score of the second user
 * @property `date` - The date of the match
 */
export interface Match {
	id?: number;
	userId1?: number;
	userId2?: number;
	userScore1?: number;
	userScore2?: number;
	date?: Date;
}

/**
 * Match service API.
 */
export default class MatchServiceAPI {
	private _baseUrl: string = "http://localhost:3000/api/matches";

	/**
	 * Get all matches
	 * @returns A promise that resolves to an array of matches
	 */
	async getAllMatches(): Promise<Match[]> {
		const response = await fetch(`${this._baseUrl}`, {
			method: "GET",
			headers: {
				"Authorization": `Bearer CONNECTED_USER_TOKEN`,
			}
		});
		if (response.status !== 200) {
			throw new Error(`Failed to fetch matches: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Create a new match
	 * @param match - The match object to create
	 * @returns A promise that resolves to the created match
	 */
	async createMatch(match: Match): Promise<Match> {
		const response = await fetch(`${this._baseUrl}`, {
			method: "POST",
			headers: {
				"Authorization": `Bearer CONNECTED_USER_TOKEN`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(match)
		});
		if (response.status !== 201) {
			throw new Error(`Failed to create match: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Get a match by ID
	 * @param id - The ID of the match
	 * @returns A promise that resolves to the match
	 */
	async getMatchById(id: number): Promise<Match> {
		const response = await fetch(`${this._baseUrl}/${id}`, {
			method: "GET",
			headers: {
				"Authorization": `Bearer CONNECTED_USER_TOKEN`,
			}
		});
		if (response.status !== 200) {
			throw new Error(`Failed to fetch match: ${response.statusText}`);
		}
		return response.json();
	}
}
