import UserProfileService from './UserProfileService.js';
import MatchServiceAPI, { Match, Tournament } from './api/match.js';
import UsersApi from './api/user.js';
import AvatarServiceAPI from './api/avatar.js';
import CacheManager, { CacheableService } from './CacheManager.js';

export interface EnrichedMatch {
	match: Match;
	opponent: {
		id: number;
		username: string;
		avatarUrl: string;
	};
	isWin: boolean;
}

export interface EnrichedMatchHistory {
	enrichedMatches: EnrichedMatch[];
	currentUserAvatarUrl: string;
}

export default class MatchHistoryService implements CacheableService {
    private static _instance: MatchHistoryService;
    private _userProfileService = UserProfileService.getInstance();
    private _matchApi = new MatchServiceAPI();
	private _usersApi = new UsersApi();
	private _avatarApi = new AvatarServiceAPI();
    private _enrichedMatchHistoryCache: EnrichedMatchHistory | null = null;
    private _tournamentHistoryCache: Tournament[] | null = null;
    private _userNameCache: Map<string, string> = new Map();
    public readonly serviceName = 'MatchHistoryService';

    private constructor() {
        const cacheManager = CacheManager.getInstance();
        cacheManager.registerService(this, [
            'USER_LOGIN',
            'USER_LOGOUT',
            'MATCH_ADDED',
            'AVATAR_UPDATED',
            'TOURNAMENT_REPORTED'
        ]);
    }

    public static getInstance(): MatchHistoryService {
        if (!MatchHistoryService._instance) {
            MatchHistoryService._instance = new MatchHistoryService();
        }
        return MatchHistoryService._instance;
    }

    /**
     * Gets the full match history for the current user, enriched with opponent data and avatars.
     * Implements a simple cache-on-read strategy.
     * @returns A promise that resolves to the user's enriched match history.
     */
    public async getEnrichedMatchHistory(walletAddress: string): Promise<EnrichedMatchHistory> {
        if (this._enrichedMatchHistoryCache) {
            return this._enrichedMatchHistoryCache;
        }

        if (!walletAddress) {
            throw new Error("Wallet address is missing.");
        }

		const currentUser = await this._userProfileService.getEnrichedUserProfile();
		if (!currentUser) {
			throw new Error("Current user profile not found.");
		}

		const currentUserAvatarUrl = await this._avatarApi.getUserAvatarUrl(currentUser.id!)
			.catch(() => '/assets/defaultAvatar.jpg');

        const matches = await this._matchApi.getMatchesByPlayer(walletAddress);
        if (matches.length === 0) {
			const result = {
				enrichedMatches: [],
				currentUserAvatarUrl: currentUserAvatarUrl
			};
			this._enrichedMatchHistoryCache = result;
            return result;
        }

        const enrichedMatches = await Promise.all(
            matches.map(async (match): Promise<EnrichedMatch> => {
                const opponentAddress = match.player1 === walletAddress ? match.player2 : match.player1;
                let opponentData = { id: 0, username: 'Unknown', avatarUrl: '/assets/defaultAvatar.jpg' };

                if (opponentAddress) {
                    try {
                        const opponentUser = await this._usersApi.getUserByWallet(opponentAddress);
                        const opponentAvatar = await this._avatarApi.getUserAvatarUrl(opponentUser.id!)
                            .catch(() => '/assets/defaultAvatar.jpg');

                        opponentData = {
                            id: opponentUser.id!,
                            username: opponentUser.username!,
                            avatarUrl: opponentAvatar,
                        };
                    } catch (error) {
                        console.error(`Failed to get opponent details for wallet ${opponentAddress}`, error);
                    }
                }

                return {
                    match,
                    opponent: opponentData,
                    isWin: match.winner === walletAddress,
                };
            })
        );

		const result = {
			enrichedMatches,
			currentUserAvatarUrl
		};

        this._enrichedMatchHistoryCache = result;
        return result;
    }

    /**
     * Gets the full match history for the current user.
     * Implements a simple cache-on-read strategy.
     * @returns A promise that resolves to the user's match history.
     */
    public async getMatchHistory(walletAddress: string): Promise<Match[]> {
        const enrichedHistory = await this.getEnrichedMatchHistory(walletAddress);
        return enrichedHistory.enrichedMatches.map(enriched => enriched.match);
    }

    /**
     * Gets the full tournament history for the current user.
     * Implements a simple cache-on-read strategy.
     * @returns A promise that resolves to the user's tournament history.
     */
    public async getTournamentHistory(walletAddress: string): Promise<Tournament[]> {
        if (this._tournamentHistoryCache) {
            return this._tournamentHistoryCache;
        }

        if (!walletAddress) {
            throw new Error("Wallet address is missing.");
        }

        const tournamentHistory = await this._matchApi.getTournamentsByWinner(walletAddress);
        this._tournamentHistoryCache = tournamentHistory;

        return tournamentHistory;
    }

    /**
     * Clears the local caches for match and tournament history.
     */
    public clearCache(): void {
        this._enrichedMatchHistoryCache = null;
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

        const cacheManager = CacheManager.getInstance();
        cacheManager.triggerEvent({
            type: 'MATCH_ADDED',
            data: { matchId: match.matchId, winner: match.winner }
        });

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

        const cacheManager = CacheManager.getInstance();
        cacheManager.triggerEvent({
            type: 'TOURNAMENT_REPORTED',
            data: { winner: tournament.winner }
        });

        return txHash;
    }
}
