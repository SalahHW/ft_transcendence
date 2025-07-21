import MatchServiceAPI, { Match, Tournament } from './api/match.js';
import UsersApi from './api/user.js';
import CacheManager, { CacheableService } from './CacheManager.js';
import AvatarService from './AvatarService.js';

export interface PlayerInfo {
    id: number;
    username: string;
    avatarUrl: string;
    walletAddress: string;
}

export interface EnrichedMatch {
	match: Match;
	opponent: PlayerInfo;
	isWin: boolean;
    userScore: number;
    opponentScore: number;
}

export interface EnrichedMatchHistory {
	enrichedMatches: EnrichedMatch[];
	currentUser: PlayerInfo;
}

export interface EnrichedTournament {
    id: number;
    endTimestamp: number;
    players: PlayerInfo[];
    userPlacement: number;
	isWin: boolean;
}

export default class MatchHistoryService implements CacheableService {
    private static _instance: MatchHistoryService;
    private _matchApi = new MatchServiceAPI();
	private _usersApi = new UsersApi();
	private _avatarService = AvatarService.getInstance();
    private _enrichedMatchHistoryCache: EnrichedMatchHistory | null = null;
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
	public async getEnrichedTournamentHistory(
        walletAddress: string,
        onUpdate?: (updatedData: EnrichedTournament[]) => void
    ): Promise<EnrichedTournament[]> {
        if (this._enrichedTournamentHistoryCache && onUpdate) {
            onUpdate(this._enrichedTournamentHistoryCache);
        }

        if (!walletAddress) {
            throw new Error("Wallet address is missing.");
        }

        const rawTournaments = await this._matchApi.getTournamentsByPlayer(walletAddress);

        if (rawTournaments.length === 0) {
            this._enrichedTournamentHistoryCache = [];
            if (onUpdate) onUpdate([]);
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
						const avatarUrl = await this._avatarService.getAvatarUrlForUser(user.id!);

						return {
							id: user.id!,
							username: user.username!,
							avatarUrl,
							walletAddress: wallet
						};
					})
				);

				const { userPlacement } = this.calculateUserPlacement(
					matches,
					Array.from(playerWallets),
					walletAddress
				);

				return {
					id: tournament.tournamentId!,
					endTimestamp: tournament.endTimestamp!,
					players,
					userPlacement,
					isWin: tournament.winner === walletAddress,
				};
			})
		);

		this._enrichedTournamentHistoryCache = enrichedTournaments;
        if (onUpdate) {
            onUpdate(enrichedTournaments);
        }
		return enrichedTournaments;
    }

	private calculateUserPlacement(matches: Match[], players: string[], userWallet: string): { userPlacement: number } {
		const winCounts: Map<string, number> = new Map();
		players.forEach(p => winCounts.set(p, 0));

		matches.forEach(match => {
			if (match.winner) {
				winCounts.set(match.winner, (winCounts.get(match.winner) ?? 0) + 1);
			}
		});

		const tournamentWinner = [...winCounts.entries()].find(([, wins]) => wins === 2)?.[0];
		const userWins = winCounts.get(userWallet) ?? 0;

		if (userWins === 2 || tournamentWinner === userWallet) {
			return { userPlacement: 1 };
		}

		if (userWins === 0) {
			return { userPlacement: 4 };
		}

		if (userWins === 1) {
			const userLostMatch = matches.find(m =>
				(m.player1 === userWallet || m.player2 === userWallet) && m.winner !== userWallet
			);

			if (userLostMatch?.winner === tournamentWinner) {
				return { userPlacement: 2 };
			} else {
				return { userPlacement: 3 };
			}
		}

		return { userPlacement: 4 };
	}


    /**
     * Gets the full match history for the current user, enriched with opponent data and avatars.
     * Implements a simple cache-on-read strategy.
     * @returns A promise that resolves to the user's enriched match history.
     */
    public async getEnrichedMatchHistory(
        walletAddress: string,
        onUpdate?: (updatedData: EnrichedMatchHistory) => void
    ): Promise<EnrichedMatchHistory> {
        if (this._enrichedMatchHistoryCache && onUpdate) {
            onUpdate(this._enrichedMatchHistoryCache);
        }
        if (!walletAddress) {
            throw new Error("Wallet address is missing.");
        }

        const currentUser = await this._getCurrentPlayerInfo(walletAddress);
        const matches = await this._matchApi.getMatchesByPlayer(walletAddress);

        if (matches.length === 0) {
            const result = { enrichedMatches: [], currentUser };
            this._enrichedMatchHistoryCache = result;
            if (onUpdate) onUpdate(result);
            return result;
        }

        const enrichedMatches = await Promise.all(
            matches.map(async (match) => {
                const opponentAddress = match.player1 === walletAddress ? match.player2! : match.player1!;
                const opponent = await this._getOpponentPlayerInfo(opponentAddress);
                return this._enrichSingleMatch(match, walletAddress, opponent);
            })
        );

        const result = { enrichedMatches, currentUser };
        this._enrichedMatchHistoryCache = result;
        if (onUpdate) onUpdate(result);
        return result;
    }

	private async _getCurrentPlayerInfo(walletAddress: string): Promise<PlayerInfo> {
		const user = await this._usersApi.getUserByWallet(walletAddress);
		if (!user) {
			throw new Error("Current user profile not found.");
		}

		const avatarUrl = await this._avatarService.getAvatarUrlForUser(user.id!);

		return {
			id: user.id!,
			username: user.username!,
			avatarUrl,
			walletAddress,
		};
	}

	private async _getOpponentPlayerInfo(opponentAddress: string): Promise<PlayerInfo> {
		if (!opponentAddress) {
			return { id: 0, username: 'Unknown', avatarUrl: '/assets/defaultAvatar.jpg', walletAddress: '' };
		}
		try {
			const opponentUser = await this._usersApi.getUserByWallet(opponentAddress);
			const avatarUrl = await this._avatarService.getAvatarUrlForUser(opponentUser.id!);

			return {
				id: opponentUser.id!,
				username: opponentUser.username!,
				avatarUrl,
				walletAddress: opponentAddress,
			};
		} catch (error) {
			console.error(`Failed to get opponent details for wallet ${opponentAddress}`, error);
			return { id: 0, username: 'Unknown', avatarUrl: '/assets/defaultAvatar.jpg', walletAddress: opponentAddress };
		}
	}

	private _enrichSingleMatch(match: Match, currentUserWallet: string, opponent: PlayerInfo): EnrichedMatch {
		const isWin = match.winner === currentUserWallet;
		const userScore = match.player1 === currentUserWallet ? match.player1Score! : match.player2Score!;
		const opponentScore = match.player1 === currentUserWallet ? match.player2Score! : match.player1Score!;

		return {
			match,
			opponent,
			isWin,
			userScore,
			opponentScore
		};
    }

    public async getMatchHistory(walletAddress: string): Promise<Match[]> {
        const enrichedHistory = await this.getEnrichedMatchHistory(walletAddress);
        return enrichedHistory.enrichedMatches.map((enriched: EnrichedMatch) => enriched.match);
    }

    public async getTournamentHistory(walletAddress: string): Promise<Tournament[]> {
        const tournaments = await this.getEnrichedTournamentHistory(walletAddress);
        return tournaments;
    }

    /**
     * Clears the local caches for match and tournament history.
     */
    public clearCache(): void {
        this._enrichedMatchHistoryCache = null;
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
