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

export interface PlayerInfo {
    id: number;
    username: string;
    avatarUrl: string;
    walletAddress: string;
}

export interface EnrichedTournament {
    id: number;
    // timestamp: number; // TODO: Need to determine how to get this
    players: PlayerInfo[];
    userPlacement: number;
	isWin: boolean;
}

export default class MatchHistoryService implements CacheableService {
    private static _instance: MatchHistoryService;
    private _userProfileService = UserProfileService.getInstance();
    private _matchApi = new MatchServiceAPI();
	private _usersApi = new UsersApi();
	private _avatarApi = new AvatarServiceAPI();
    private _enrichedMatchHistoryCache: EnrichedMatchHistory | null = null;
    private _tournamentHistoryCache: Tournament[] | null = null;
	private _enrichedTournamentHistoryCache: EnrichedTournament[] | null = null;
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
     * Gets the full tournament history for the current user, enriched with opponent data and avatars.
     * Implements a simple cache-on-read strategy.
     * @returns A promise that resolves to the user's enriched tournament history.
     */
	public async getEnrichedTournamentHistory(walletAddress: string): Promise<EnrichedTournament[]> {
        if (this._enrichedTournamentHistoryCache) {
            return this._enrichedTournamentHistoryCache;
        }

        if (!walletAddress) {
            throw new Error("Wallet address is missing.");
        }

        const rawTournaments = await this._matchApi.getTournamentsByPlayer(walletAddress);

        if (rawTournaments.length === 0) {
            return [];
        }

		const enrichedTournaments = await Promise.all(
			rawTournaments.map(async (tournament): Promise<EnrichedTournament> => {
				const matches = await Promise.all(
					tournament.matchIds!.map(id => this._matchApi.getMatchById(id))
				);

				const playerWallets = new Set<string>();
				matches.forEach(match => {
					playerWallets.add(match.player1!);
					playerWallets.add(match.player2!);
				});

				const players = await Promise.all(
					Array.from(playerWallets).map(async (wallet): Promise<PlayerInfo> => {
						const user = await this._usersApi.getUserByWallet(wallet);
						const avatarUrl = await this._avatarApi.getUserAvatarUrl(user.id!)
							.catch(() => '/assets/defaultAvatar.jpg');
						return {
							id: user.id!,
							username: user.username!,
							avatarUrl: avatarUrl,
							walletAddress: wallet
						};
					})
				);

				const { userPlacement, isWin } = this.calculateUserPlacement(matches, walletAddress);

				return {
					id: tournament.tournamentId!,
					players,
					userPlacement,
					isWin
				};
			})
		);

		this._enrichedTournamentHistoryCache = enrichedTournaments;
		return enrichedTournaments;
    }

	private calculateUserPlacement(matches: Match[], userWallet: string): { userPlacement: number, isWin: boolean } {
		const wins = matches.filter(m => m.winner === userWallet).length;
        // TODO: Need to determine how to get the placement in the tournament when we get the api response format
		// This is a simplified placement logic.
		// A real implementation would need to understand the tournament bracket structure (e.g., final, semi-finals).
		// For now, we'll base it on number of wins.
		if (wins === 2) return { userPlacement: 1, isWin: true }; // Assuming 2 wins means 1st place in a 4-person tournament
		if (wins === 1) return { userPlacement: 2, isWin: false }; // Assuming 1 win means 2nd place

		// For 0 wins, we need to differentiate 3rd and 4th.
		// This requires more detail about the matches, like who they lost to.
		// For now, let's simplify. We can't distinguish 3rd and 4th with this logic.
		const losses = matches.filter(m => (m.player1 === userWallet || m.player2 === userWallet) && m.winner !== userWallet);
		if (losses.length > 0) {
			const opponentInLoss = losses[0].player1 === userWallet ? losses[0].player2 : losses[0].player1;
			const opponentWins = matches.filter(m => m.winner === opponentInLoss).length;
			if (opponentWins > 1) { // Lost to the winner or finalist
				return { userPlacement: 3, isWin: false };
			}
		}

		return { userPlacement: 4, isWin: false };
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
		this._enrichedTournamentHistoryCache = null;
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
