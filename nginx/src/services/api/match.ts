const mapRawMatchToMatch = (rawMatch: any): Match => {
	if (!rawMatch || typeof rawMatch !== 'object' || Array.isArray(rawMatch)) {
		return rawMatch as Match;
	}
	return {
		player1: rawMatch.player1.toLowerCase(),
		player2: rawMatch.player2.toLowerCase(),
		winner: rawMatch.winner.toLowerCase(),
		player1Score: parseInt(rawMatch.player1Score, 10),
		player2Score: parseInt(rawMatch.player2Score, 10),
		matchId: parseInt(rawMatch.matchId, 10),
		endTimestamp: parseInt(rawMatch.endTimestamp, 10),
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
	endTimestamp?: number;
}

const mapRawTournamentObjectToTournamentObject = (tournament: any): Tournament => {
    if (!tournament || typeof tournament !== 'object' || Array.isArray(tournament)) {
        return tournament as Tournament;
    }
    return {
        endTimestamp: parseInt(tournament.endTimestamp, 10),
        matchIds: tournament.matchIds.map((id: string) => parseInt(id, 10)),
        tournamentId: parseInt(tournament.tournamentId, 10),
        winner: tournament.winnerAddress.toLowerCase(),
    };
};

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
		const response = await fetch(`${this._baseUrl}/match/player/${address}`, {
			method: "GET"
		});
		if (response.status === 404) {
			console.log(`No matches found for player ${address}.`);
			return [];
		}
		if (!response.headers.get('content-type')?.includes('application/json')) {
			console.log(`No matches found for player ${address}.`);
			return [];
		}
		const data = await response.json();
		if (response.ok && !data.success) {
			console.log(`No matches found for player ${address}.`);
			return [];
		}
		if (response.ok && data.success) {
			console.log(`Successfully fetched matches for player ${address}.`);
			return data.matches.map(mapRawMatchToMatch);
		}
		console.error(`Failed to fetch matches for player ${address}:`, data);
		throw new Error(`Failed to fetch matches. Please try again later.`);
	}

	/**
	 * Get all tournaments a player participated in.
	 * @param address - The player's address
	 * @returns A promise that resolves to an array of tournaments
	 */
	async getTournamentsByPlayer(address: string): Promise<Tournament[]> {
		const response = await fetch(`${this._baseUrl}/tournaments/byPlayer/${address}`, {
			method: "GET"
		});
		if (response.status === 404) {
			console.log(`No tournaments found for player ${address}.`);
			return [];
		}
		if (!response.headers.get('content-type')?.includes('application/json')) {
			console.log(`No tournaments found for player ${address}.`);
			return [];
		}
		const data = await response.json();
		if (response.ok && data.success) {
			console.log(`Successfully fetched tournaments for player ${address}.`);
			return data.tournaments.map(mapRawTournamentObjectToTournamentObject);
		}
		if (response.ok && !data.success) {
			console.log(`No tournaments found for player ${address}.`);
			return [];
		}
		console.error(`Failed to fetch tournaments for player ${address}:`, data);
		throw new Error(`Failed to fetch tournaments. Please try again later.`);
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
		if (response.status === 404) {
			console.log(`No matches found for winner ${address}.`);
			return [];
		}
		if (!response.headers.get('content-type')?.includes('application/json')) {
			console.log(`No matches found for winner ${address}.`);
			return [];
		}
		const data = await response.json();
		if (response.ok && data.success) {
			console.log(`Successfully fetched matches for winner ${address}.`);
			return data.matches.map(mapRawMatchToMatch);
		}
		if (response.ok && !data.success) {
			console.log(`No matches found for winner ${address}.`);
			return [];
		}
		console.error(`Failed to fetch matches for winner ${address}:`, data);
		throw new Error(`Failed to fetch matches. Please try again later.`);
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
		if (response.ok && data.success) {
			console.log(`Successfully fetched match with id ${matchId}.`);
			return mapRawMatchToMatch(data.match);
		}
		else {
			console.error(`Failed to fetch match with id ${matchId}:`, data);
			throw new Error(`Failed to fetch match details. Please try again later.`);
		}
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
		if (response.status === 200 && data.success) {
			console.log("Match reported successfully.");
			return data.transactionHash;
		}
		else {
			console.error("Failed to report match:", data);
			throw new Error(`Failed to report match. Please try again later.`);
		}
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
		if (response.status === 200 && data.success) {
			console.log("Tournament reported successfully.");
			return data.transactionHash;
		}
		else {
			console.error("Failed to report tournament:", data);
			throw new Error(`Failed to report tournament. Please try again later.`);
		}
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
		if (response.status === 200 && data.success) {
			console.log(`Successfully fetched tournament with id ${tournamentId}.`);
			return data.tournament;
		}
		else {
			console.error(`Failed to fetch tournament with id ${tournamentId}:`, data);
			throw new Error(`Failed to fetch tournament details. Please try again later.`);
		}
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
		if (response.status === 404) {
			console.log(`No tournaments found for winner ${address}.`);
			return [];
		}
		if (!response.headers.get('content-type')?.includes('application/json')) {
			console.log(`No tournaments found for winner ${address}.`);
			return [];
		}
		const data = await response.json();
		if (response.ok && data.success) {
			console.log(`Successfully fetched tournaments for winner ${address}.`);
			return data.tournaments.map(mapRawTournamentObjectToTournamentObject);
		}
		if (response.ok && !data.success) {
			console.log(`No tournaments found for winner ${address}.`);
			return [];
		}
		console.error(`Failed to fetch tournaments for winner ${address}:`, data);
		throw new Error(`Failed to fetch tournaments. Please try again later.`);
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
		if (response.status === 200 && data.success) {
			console.log(`Successfully fetched player name for address ${address}.`);
			return data.name;
		}
		else {
			console.error(`Failed to fetch player name for address ${address}:`, data);
			throw new Error(`Failed to fetch player name. Please try again later.`);
		}
	}
}
