const mapMatchArrayToMatchObject = (match: any[]): Match => {
	if (!match || !Array.isArray(match)) {
		return match as Match;
	}
	return {
		player1: match[0],
		player2: match[1],
		winner: match[2],
		player1Score: parseInt(match[3], 10),
		player2Score: parseInt(match[4], 10),
		matchId: parseInt(match[5], 10),
	};
};

/**
 * Match object.
 * @property `matchId` - The match's ID
 * @property `player1` - The address of the first player
 * @property `player2` - The address of the second player
 * @property `player1Score` - The score of the first player
 * @property `player2Score` - The score of the second player
 * @property `winner` - The address of the winner
 */
export interface Match {
	matchId?: number;
	player1?: string;
	player2?: string;
	player1Score?: number;
	player2Score?: number;
	winner?: string;
}

/**
 * Tournament object.
 * @property `tournamentId` - The tournament's ID
 * @property `endTimestamp` - The end timestamp of the tournament
 * @property `matchIds` - The IDs of the matches in the tournament
 * @property `winner` - The address of the winner
 */
export interface Tournament {
	tournamentId?: number;
	endTimestamp?: number;
	matchIds?: number[];
	winner?: string;
}

/**
 * Match service API (blockchain-service).
 * Toutes les méthodes correspondent aux routes exposées par le backend Fastify du blockchain-service.
 */
export default class MatchServiceAPI {
	private _baseUrl: string = `${window.location.protocol}//${window.location.host}`;

	/**
	 * Get all matches played by a player (by address)
	 * @param address - The player's address
	 * @returns A promise that resolves to an array of matches
	 */
	async getMatchesByPlayer(address: string): Promise<Match[]> {
		try {
			const response = await fetch(`${this._baseUrl}/match/player/${address}`, {
				method: "GET"
			});
			const data = await response.json();
			if (response.status === 200 && data.success)
				return data.matches.map(mapMatchArrayToMatchObject);
			else
				throw new Error(`Failed to fetch matches by player:\n${JSON.stringify(data, null, 2)}`);
		} catch (error) {
			if (error instanceof Error && error.message.includes("Player not found.")) {
				return [];
			}
			throw error;
		}
	}

	/**
	 * Get all matches won by an address
	 * @param address - The winner's address
	 * @returns A promise that resolves to an array of matches
	 */
	async getMatchesByWinner(address: string): Promise<Match[]> {
		const response = await fetch(`${this._baseUrl}/match/winner/${address}`, {
			method: "GET"
		});
		const data = await response.json();
		if (response.status === 200 && data.success)
			return data.matches.map(mapMatchArrayToMatchObject);
		else
			throw new Error(`Failed to fetch matches by winner:\n${JSON.stringify(data, null, 2)}`);
	}

	/**
	 * Get a match by its ID
	 * @param matchId - The match ID
	 * @returns A promise that resolves to the match
	 */
	async getMatchById(matchId: number): Promise<Match> {
		const response = await fetch(`${this._baseUrl}/match/${matchId}`, {
			method: "GET"
		});
		const data = await response.json();
		if (response.status === 200 && data.success)
			return mapMatchArrayToMatchObject(data.match);
		else
			throw new Error(`Failed to fetch match by id:\n${JSON.stringify(data, null, 2)}`);
	}

	/**
	 * Report a new match (declare a match on-chain)
	 * @param match - The match object to report
	 * @property {string} player1 - Address of player 1
	 * @property {string} player2 - Address of player 2
	 * @property {string} winner - Address of the winner
	 * @returns A promise that resolves to the transaction hash
	 */
	async reportMatch(match: {
		player1: string;
		player2: string;
		matchId: number;
		player1Score: number;
		player2Score: number;
		winner: string;
	}): Promise<string> {
		const response = await fetch(`${this._baseUrl}/report-match`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(match)
		});
		const data = await response.json();
		if (response.status === 200 && data.success)
			return data.transactionHash;
		else
			throw new Error(`Failed to report match:\n${JSON.stringify(data, null, 2)}`);
	}

	/**
	 * Report a new tournament (declare a tournament on-chain)
	 * @param tournament - The tournament object to report
	 * @returns A promise that resolves to the transaction hash
	 */
	async reportTournament(tournament: {
		endTimestamp: number;
		matchIds: number[];
		winner: string;
		tournamentTokenIds: number[];
	}): Promise<string> {
		const response = await fetch(`${this._baseUrl}/report-tournament`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(tournament)
		});
		const data = await response.json();
		if (response.status === 200 && data.success)
			return data.transactionHash;
		else
			throw new Error(`Failed to report tournament:\n${JSON.stringify(data, null, 2)}`);
	}

	/**
	 * Get a tournament by its ID
	 * @param tournamentId - The tournament ID
	 * @returns A promise that resolves to the tournament
	 */
	async getTournamentById(tournamentId: number): Promise<Tournament> {
		const response = await fetch(`${this._baseUrl}/tournament/${tournamentId}`, {
			method: "GET"
		});
		const data = await response.json();
		if (response.status === 200 && data.success)
			return data.tournament;
		else
			throw new Error(`Failed to fetch tournament by id:\n${JSON.stringify(data, null, 2)}`);
	}

	/**
	 * Get all tournaments won by an address
	 * @param address - The winner's address
	 * @returns A promise that resolves to an array of tournaments
	 */
	async getTournamentsByWinner(address: string): Promise<Tournament[]> {
		const response = await fetch(`${this._baseUrl}/tournament/winner/${address}`, {
			method: "GET"
		});
		const data = await response.json();
		if (response.status === 200 && data.success)
			return data.tournaments;
		else
			throw new Error(`Failed to fetch tournaments by winner:\n${JSON.stringify(data, null, 2)}`);
	}

	/**
	 * Get a player's name by their address
	 * @param address - The player's wallet address
	 * @returns A promise that resolves to the player's name
	 */
	async getPlayerNameByAddress(address: string): Promise<string> {
		const response = await fetch(`${this._baseUrl}/player/${address}`, {
			method: "GET"
		});
		const data = await response.json();
		if (response.status === 200 && data.success)
			return data.name;
		else
			throw new Error(`Failed to fetch player name by address:\n${JSON.stringify(data, null, 2)}`);
	}
}
