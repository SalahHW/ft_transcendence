import UserProfileService from './UserProfileService.js';
import MatchServiceAPI, { Match, Tournament } from './api/match.js';

/**
 * Service to manage user match and tournament history, including caching.
 */
export default class MatchHistoryService {
    private static _instance: MatchHistoryService;
    private _userProfileService = UserProfileService.getInstance();
    private _matchApi = new MatchServiceAPI();
    private _matchHistoryCache: Match[] | null = null;
    private _tournamentHistoryCache: Tournament[] | null = null;
    private _userNameCache: Map<string, string> = new Map();

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
        if (!userProfile?.wallet) {
            throw new Error("User not authenticated or wallet address is missing.");
        }

        const matchHistory = await this._matchApi.getMatchesByPlayer(userProfile.wallet);
        this._matchHistoryCache = matchHistory;

        return matchHistory;
    }

    /**
     * Gets the full tournament history for the current user.
     * Implements a simple cache-on-read strategy.
     * @returns A promise that resolves to the user's tournament history.
     */
    public async getTournamentHistory(): Promise<Tournament[]> {
        if (this._tournamentHistoryCache) {
            return this._tournamentHistoryCache;
        }

        const userProfile = await this._userProfileService.getUserProfile();
        if (!userProfile?.wallet) {
            throw new Error("User not authenticated or wallet address is missing.");
        }

        const tournamentHistory = await this._matchApi.getTournamentsByWinner(userProfile.wallet);
        this._tournamentHistoryCache = tournamentHistory;

        return tournamentHistory;
    }

    /**
     * Clears the local caches for match and tournament history.
     */
    public clearCache(): void {
        this._matchHistoryCache = null;
        this._tournamentHistoryCache = null;
        this._userNameCache.clear();
    }

    /**
     * Reports a match and invalidates the match history cache.
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
        this._matchHistoryCache = null; // Invalidate cache
        return txHash;
    }

    /**
     * Gets a user's name by their wallet address, with caching.
     * @param address The wallet address.
     * @returns A promise that resolves to the username.
     */
    public async getUserNameByAddress(address: string): Promise<string> {
        if (this._userNameCache.has(address)) {
            return this._userNameCache.get(address)!;
        }

        const userName = await this._matchApi.getPlayerNameByAddress(address);
        this._userNameCache.set(address, userName);

        return userName;
    }

    /**
     * Reports a tournament and invalidates the tournament history cache.
     * @param tournament - The tournament data to report.
     * @returns The transaction hash.
     */
    public async reportTournament(tournament: {
        endTimestamp: number;
        matchIds: number[];
        winner: string;
        tournamentTokenIds: number[];
    }): Promise<string> {
        const txHash = await this._matchApi.reportTournament(tournament);
        this._tournamentHistoryCache = null; // Invalidate cache
        return txHash;
    }
}
