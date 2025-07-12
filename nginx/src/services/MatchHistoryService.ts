import UserProfileService from './UserProfileService.js';
import MatchServiceAPI, { Match } from './api/match.js';

/**
 * Service to manage user match history, including caching.
 */
export default class MatchHistoryService {
    private static _instance: MatchHistoryService;
    private _userProfileService = UserProfileService.getInstance();
    private _matchApi = new MatchServiceAPI();
    private _matchHistoryCache: Match[] | null = null;

    private constructor() {}

    public static getInstance(): MatchHistoryService {
        if (!MatchHistoryService._instance) {
            MatchHistoryService._instance = new MatchHistoryService();
        }
        return MatchHistoryService._instance;
    }

    /**
     * Gets the full match history for the current user.
     * Implements a simple cache-on-read strategy.
     * @returns A promise that resolves to the user's match history.
     */
    public async getMatchHistory(): Promise<Match[]> {
        if (this._matchHistoryCache) {
            return this._matchHistoryCache;
        }

        const userProfile = await this._userProfileService.getUserProfile();
        if (!userProfile?.username) {
            throw new Error("User not authenticated or username is missing.");
        }

        const matchHistory = await this._matchApi.getMatchesByPlayer(userProfile.username);
        this._matchHistoryCache = matchHistory;

        return matchHistory;
    }

    /**
     * Clears the local cache for the match history.
     */
    public clearCache(): void {
        this._matchHistoryCache = null;
    }

    /**
     * Reports a match and invalidates the cache.
     * @param match - The match data to report.
     * @returns The transaction hash.
     */
    public async reportMatch(match: {
        player1: string;
        player2: string;
        matchId: number;
        player1Score: number;
        player2Score: number;
        winner: string;
    }): Promise<string> {
        const txHash = await this._matchApi.reportMatch(match);
        this.clearCache(); // Invalidate cache after reporting a new match
        return txHash;
    }
}
