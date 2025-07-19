import MatchHistoryService, { EnrichedMatch, EnrichedTournament, PlayerInfo } from "../../../services/MatchHistoryService.js";
import UserProfileService from "../../../services/UserProfileService.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

type HistoryItem = (EnrichedTournament & { type: 'tournament' }) | (EnrichedMatch & { type: 'match' });

export class MatchHistoryView {

    private static _matchHistoryService = MatchHistoryService.getInstance();
    private static _userProfileService = UserProfileService.getInstance();

    public static async render(
        container: HTMLElement
    ): Promise<void> {
        container.innerHTML = this.renderLoadingState();

        const user = await this._userProfileService.getEnrichedUserProfile();
        if (!user || !user.wallet) {
            console.error("User not authenticated or wallet address is missing.");
            container.innerHTML = this.renderErrorState();
            return;
        }

        let enrichedMatches: EnrichedMatch[] = [];
        let enrichedTournamentHistory: EnrichedTournament[] = [];
        let currentUser: PlayerInfo | null = null;

        const updateView = async () => {
            if (!currentUser) return;

            if (enrichedMatches.length === 0 && enrichedTournamentHistory.length === 0) {
                container.innerHTML = this.renderEmptyState();
                return;
            }

            const combinedHistory: HistoryItem[] = [
                ...enrichedTournamentHistory.map((tournament): HistoryItem => ({ ...tournament, type: 'tournament' })),
                ...enrichedMatches.map((match): HistoryItem => ({ ...match, type: 'match' }))
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

            let lastSeenTournamentTimestampForNesting: number | null = null;

            const historyHtml = (
                await Promise.all(
                    combinedHistory.map(async (item, index) => {
                        if (item.type === 'tournament') {
                            lastSeenTournamentTimestampForNesting = item.endTimestamp;
                            if (!user.wallet) return '';
                            const currentUserInfo = item.players.find((p: PlayerInfo) => p.walletAddress === user.wallet);
                            return MatchHistoryView.createTournamentHistoryItem(item, currentUserInfo!);
                        } else {
                            const isNested = item.match.endTimestamp === lastSeenTournamentTimestampForNesting;
                            return MatchHistoryView.createMatchHistoryItem(item, currentUser!, isNested);
                        }
                    })
                )
            ).join('');

            container.innerHTML = /* HTML */`
                <div class="flex flex-col h-full">
                    <div class="overflow-auto flex-[1] [mask-image:linear-gradient(to_bottom,transparent,black_2%,black_98%,transparent)] pt-2 overflow-x-auto">
                        <div class="min-w-[600px] px-4">
                            ${historyHtml}
                        </div>
                    </div>
                </div>
            `;
        };

        try {
            if (!user.wallet) {
                container.innerHTML = this.renderErrorState();
                return;
            }

            this._matchHistoryService.getEnrichedTournamentHistory(user.wallet, (tournaments) => {
                enrichedTournamentHistory = tournaments;
                updateView();
            });

            this._matchHistoryService.getEnrichedMatchHistory(user.wallet, (matches) => {
                enrichedMatches = matches.enrichedMatches;
                currentUser = matches.currentUser;
                updateView();
            });

        } catch (error) {
            console.error("Error rendering MatchHistory:", error);
            container.innerHTML = this.renderErrorState();
        }
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
            if (j == 1 && k != 11) {
                return "st";
            }
            if (j == 2 && k != 12) {
                return "nd";
            }
            if (j == 3 && k != 13) {
                return "rd";
            }
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
