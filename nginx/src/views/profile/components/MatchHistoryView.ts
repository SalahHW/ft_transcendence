import MatchHistoryService, { EnrichedMatch, EnrichedTournament, PlayerInfo } from "../../../services/MatchHistoryService.js";
import UserProfileService from "../../../services/UserProfileService.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

type HistoryItem = (EnrichedTournament & { type: 'tournament' }) | (EnrichedMatch & { type: 'match' });

interface RenderableHistoryItem {
    id: string;
    type: 'tournament' | 'match';
    data: EnrichedTournament | EnrichedMatch;
    isNested: boolean;
    needsSeparator: boolean;
}

export class MatchHistoryView {
    private static _matchHistoryService = MatchHistoryService.getInstance();
    private static _userProfileService = UserProfileService.getInstance();

    private static _container: HTMLElement | null = null;
    private static _enrichedMatches: EnrichedMatch[] = [];
    private static _enrichedTournaments: EnrichedTournament[] = [];
    private static _currentUser: PlayerInfo | null = null;
    private static _userWallet: string | null = null;
    private static _dataReadyFlags = { matches: false, tournaments: false };

    public static async render(container: HTMLElement): Promise<void> {
        this._container = container;
        this._container.innerHTML = this.renderLoadingState();

        const user = await this._userProfileService.getEnrichedUserProfile();
        if (!user || !user.wallet) {
            console.error("User not authenticated or wallet address is missing.");
            if (this._container) this._container.innerHTML = this.renderErrorState();
            return;
        }

        this._userWallet = user.wallet;
        this._resetState();
        this._initDataFetch();
    }

    private static _resetState(): void {
        this._enrichedMatches = [];
        this._enrichedTournaments = [];
        this._currentUser = null;
        this._dataReadyFlags = { matches: false, tournaments: false };
    }

    private static _initDataFetch(): void {
        if (!this._userWallet) return;

        this._matchHistoryService.getEnrichedTournamentHistory(this._userWallet, (tournaments) => {
            this._enrichedTournaments = tournaments;
            this._dataReadyFlags.tournaments = true;
            this._onDataUpdate();
        });

        this._matchHistoryService.getEnrichedMatchHistory(this._userWallet, (matchHistory) => {
            this._enrichedMatches = matchHistory.enrichedMatches;
            this._currentUser = matchHistory.currentUser;
            this._dataReadyFlags.matches = true;
            this._onDataUpdate();
        });
    }

    private static _onDataUpdate(): void {
        if (!this._dataReadyFlags.matches || !this._dataReadyFlags.tournaments) {
            return;
        }
        this._renderToDOM();
    }

    private static _prepareRenderableHistory(): RenderableHistoryItem[] {
        const combinedHistory: HistoryItem[] = [
            ...this._enrichedTournaments.map((tournament): HistoryItem => ({ ...tournament, type: 'tournament' })),
            ...this._enrichedMatches.map((match): HistoryItem => ({ ...match, type: 'match' }))
        ];

        combinedHistory.sort((a, b) => {
            const aTimestamp = a.type === 'tournament' ? a.endTimestamp : a.match.endTimestamp!;
            const bTimestamp = b.type === 'tournament' ? b.endTimestamp : b.match.endTimestamp!;
            if (bTimestamp > aTimestamp) return 1;
            if (bTimestamp < aTimestamp) return -1;
            if (a.type === 'tournament' && b.type !== 'tournament') return -1;
            if (a.type !== 'tournament' && b.type === 'tournament') return 1;
            return 0;
        });

        const validGroupTimestamps = this._getValidGroupTimestamps(combinedHistory);
        let lastSeenTournamentTimestampForNesting: number | null = null;

        return combinedHistory.map((item, index) => {
            const currentTimestamp = item.type === 'tournament' ? item.endTimestamp : item.match.endTimestamp!;
            if (item.type === 'tournament') {
                lastSeenTournamentTimestampForNesting = item.endTimestamp;
            }

            const isNested = item.type === 'match' && item.match.endTimestamp === lastSeenTournamentTimestampForNesting;

            let needsSeparator = false;
            if (index > 0) {
                const prevItem = combinedHistory[index - 1];
                const prevTimestamp = prevItem.type === 'tournament' ? prevItem.endTimestamp : prevItem.match.endTimestamp!;
                const isCurrentInGroup = validGroupTimestamps.has(currentTimestamp);
                const isPrevInGroup = validGroupTimestamps.has(prevTimestamp);

                if (isCurrentInGroup !== isPrevInGroup) {
                    needsSeparator = true;
                } else if (isCurrentInGroup && currentTimestamp !== prevTimestamp) {
                    needsSeparator = true;
                }
            }

            return {
                id: `${item.type}-${item.type === 'tournament' ? item.id : item.match.matchId}`,
                type: item.type,
                data: item,
                isNested,
                needsSeparator,
            };
        });
    }

    private static _getValidGroupTimestamps(history: HistoryItem[]): Set<number> {
        const itemsByTimestamp = new Map<number, HistoryItem[]>();
        history.forEach(item => {
            const timestamp = item.type === 'tournament' ? item.endTimestamp : item.match.endTimestamp!;
            if (!itemsByTimestamp.has(timestamp)) {
                itemsByTimestamp.set(timestamp, []);
            }
            itemsByTimestamp.get(timestamp)!.push(item);
        });

        const validGroupTimestamps = new Set<number>();
        for (const [timestamp, items] of itemsByTimestamp.entries()) {
            if (items.some(i => i.type === 'tournament') && items.some(i => i.type === 'match')) {
                validGroupTimestamps.add(timestamp);
            }
        }
        return validGroupTimestamps;
    }

    private static async _renderToDOM(): Promise<void> {
        if (!this._container || !this._currentUser) return;

        if (this._enrichedMatches.length === 0 && this._enrichedTournaments.length === 0) {
            this._container.innerHTML = this.renderEmptyState();
            return;
        }

        const renderableItems = this._prepareRenderableHistory();
        const htmlFragments = await Promise.all(renderableItems.map(item => this._renderItem(item)));

        const historyHtml = htmlFragments.join('');

        this._container.innerHTML = /* HTML */`
            <div class="flex flex-col h-full">
                <div class="overflow-auto flex-[1] [mask-image:linear-gradient(to_bottom,transparent,black_2%,black_98%,transparent)] pt-2 overflow-x-auto">
                    <div class="min-w-[600px] px-4">
                        ${historyHtml}
                    </div>
                </div>
            </div>
        `;
    }

    private static async _renderItem(item: RenderableHistoryItem): Promise<string> {
        const separatorHtml = item.needsSeparator ? `<div class="h-px w-full my-4 bg-white/10"></div>` : '';
        let itemHtml = '';

        if (item.type === 'tournament' && this._userWallet) {
            const tournament = item.data as EnrichedTournament;
            const currentUserInfo = tournament.players.find((p: PlayerInfo) => p.walletAddress === this._userWallet);
            if (currentUserInfo) {
                itemHtml = await MatchHistoryView.createTournamentHistoryItem(tournament, currentUserInfo);
            }
        } else {
            const match = item.data as EnrichedMatch;
            itemHtml = await MatchHistoryView.createMatchHistoryItem(match, this._currentUser!, item.isNested);
        }

        return separatorHtml + itemHtml;
    }

	private static renderLoadingState(): string {
        return /* HTML */`
            <div class="flex flex-col h-full justify-center items-center">
                <p class="text-gray-400">Loading match history...</p>
            </div>
        `;
    }

	private static renderEmptyState(): string {
		return /* HTML */`
			<div class="flex flex-col h-full justify-center items-center">
				<p class="text-gray-400">No match history</p>
			</div>
		`;
	}

	private static renderErrorState(): string {
		return /* HTML */`
			<div class="flex flex-col h-full justify-center items-center">
				<p class="text-red-500">Error loading match history.</p>
			</div>
		`;
	}

    private static async createTournamentHistoryItem(
        enrichedTournament: EnrichedTournament,
        currentUser: PlayerInfo
    ): Promise<string> {
        const { players, userPlacement, isWin, endTimestamp } = enrichedTournament;
        const resultText = isWin ? 'VICTORY' : 'DEFEAT';
        const resultColor = isWin ? UI_THEME.colors.green.light : UI_THEME.colors.red.light;
        const bgColor = isWin ? UI_THEME.colors.green.dark : UI_THEME.colors.red.dark;
        const placementSuffix = (placement: number) => {
            const j = placement % 10, k = placement % 100;
            if (j == 1 && k != 11) { return "st"; }
            if (j == 2 && k != 12) { return "nd"; }
            if (j == 3 && k != 13) { return "rd"; }
            return "th";
        };

        const date = new Date(endTimestamp * 1000);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('en-GB', { month: 'short' });
        const year = date.getFullYear().toString().slice(-2);
        const formattedDate = `${day} ${month} ${year}`;
		const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        const otherPlayers = players.filter((p) => p.username !== currentUser.username);
        const otherPlayersHtml = otherPlayers.map((player) => /* HTML */ `
            <div class="flex flex-col items-center ml-2">
                <img src="${player.avatarUrl}" alt="${player.username} avatar" class="w-10 h-10 rounded-lg object-cover">
                <span class="text-white text-sm mt-1">${player.username}</span>
            </div>
        `).join('');

        return /* HTML */ `
            <div
				class="flex items-stretch justify-between rounded-lg mb-2 overflow-hidden"
				style="background-color: ${bgColor}95;"
			>
				<div class="flex items-center p-4 flex-grow">
					<div class="flex items-center w-1/3">
						<div>
							<img src="${currentUser.avatarUrl}" alt="${currentUser.username} avatar" class="text-white w-20 h-20 rounded-lg object-cover">
						</div>
						<div class="ml-4">
							<span class="text-white text-base">${currentUser.username}</span>
						</div>
					</div>
					<div class="font-bold text-lg text-center w-1/3 flex flex-col justify-center items-center">
						<span class="font-bold text-4xl" style="color: ${resultColor}">${resultText}</span>
						<div>
							<span class="w-8 text-center text-white font-bold text-2xl"
								>${userPlacement}${placementSuffix(userPlacement)}</span
							>
						</div>
					</div>
					<div class="flex items-center justify-end w-1/3">
						${otherPlayersHtml}
					</div>
				</div>
				<div class="flex items-center justify-center w-10" style="background-color: ${bgColor};">
					<span
						class="text-white font-semibold text-xs opacity-80"
						style="writing-mode: vertical-rl; text-orientation: mixed; text-align: center;"
						>${formattedDate}<br />${formattedTime}</span
					>
				</div>
			</div>
		`;
    }

    private static async createMatchHistoryItem(
        enrichedMatch: EnrichedMatch,
        currentUser: PlayerInfo,
        isNested: boolean = false
    ): Promise<string> {
		const { opponent, isWin, userScore, opponentScore, match } = enrichedMatch;

        const resultText = isWin ? "VICTORY" : "DEFEAT";
        const resultColor = isWin ? UI_THEME.colors.green.light : UI_THEME.colors.red.light;

        const bgColor = isWin ? UI_THEME.colors.green.dark : UI_THEME.colors.red.dark;

        const date = new Date(match.endTimestamp! * 1000);
        const day = date.getDate().toString().padStart(2, "0");
        const month = date.toLocaleString("en-US", { month: "short" });
        const year = date.getFullYear().toString().slice(-2);
        const formattedDate = `${day} ${month} ${year}`;
		const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const dynamicStyle = isNested ? `margin-left: 2.5rem; width: calc(100% - 2.5rem);` : '';

        return /* HTML */ `
            <div
				class="flex items-stretch justify-between rounded-lg mb-2 overflow-hidden transition-all duration-300"
				style="background-color: ${bgColor}95; ${dynamicStyle}"
			>
				<div class="flex items-center justify-between p-4 flex-grow">
					<div class="flex items-center w-1/3">
						<div>
							<img
								src="${currentUser.avatarUrl}"
								alt="${currentUser.username} avatar"
								class="text-white w-10 h-10 rounded-lg object-cover"
							/>
						</div>
						<div class="ml-4">
							<span class="text-white">${currentUser.username}</span>
						</div>
					</div>
					<div class="font-bold text-lg text-center w-1/3 flex flex-col justify-center items-center">
						<span class="font-bold text-2xl" style="color: ${resultColor}">${resultText}</span>
						<div>
							<span class="w-8 text-right text-white">${userScore ?? "?"}</span>
							<span class="mx-2 text-white">-</span>
							<span class="w-8 text-left text-white">${opponentScore ?? "?"}</span>
						</div>
					</div>
					<div class="flex items-center justify-end w-1/3">
						<div class="mr-4">
							<span class="text-white">${opponent.username}</span>
						</div>
						<div>
							<img
								src="${opponent.avatarUrl}"
								alt="${opponent.username} avatar"
								class=" text-white w-10 h-10 rounded-lg object-cover"
							/>
						</div>
					</div>
				</div>
				<div class="flex items-center justify-center w-10" style="background-color: ${bgColor};">
					<span
						class="text-white font-semibold text-xs opacity-80"
						style="writing-mode: vertical-rl; text-orientation: mixed; text-align: center;"
						>${formattedDate}<br />${formattedTime}</span
					>
				</div>
			</div>
		`;
    }
}
