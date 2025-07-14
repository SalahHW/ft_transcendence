import MatchHistoryService, { EnrichedMatch, EnrichedTournament, PlayerInfo } from "../../../services/MatchHistoryService.js";
import UserProfileService from "../../../services/UserProfileService.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export class MatchHistoryView {

    private static _matchHistoryService = MatchHistoryService.getInstance();
    private static _userProfileService = UserProfileService.getInstance();

    public static async render(): Promise<string> {
        try {
			const user = await this._userProfileService.getEnrichedUserProfile();
			if (!user || !user.wallet) {
				console.error("User not authenticated or wallet address is missing.");
				return this.renderErrorState();
			}

            const [enrichedHistory, enrichedTournamentHistory] = await Promise.all([
				this._matchHistoryService.getEnrichedMatchHistory(user.wallet),
				this._matchHistoryService.getEnrichedTournamentHistory(user.wallet)
			]);

			const { enrichedMatches, currentUserAvatarUrl } = enrichedHistory;

            const tournamentItemsHtml = (await Promise.all(enrichedTournamentHistory.map(tournament => {
                const currentUserInfo = tournament.players.find(p => p.walletAddress === user.wallet);
                return MatchHistoryView.createTournamentHistoryItem(tournament, currentUserInfo!);
            }))).join('');

            if (enrichedMatches.length === 0 && enrichedTournamentHistory.length === 0)
				return this.renderEmptyState();

            const matchesHtmlPromises = enrichedMatches.map((enrichedMatch: EnrichedMatch) => this.createMatchHistoryItem(enrichedMatch, user, currentUserAvatarUrl));
            const matchesHtml = (await Promise.all(matchesHtmlPromises)).join('');
            return /* HTML */`
                <div class="flex flex-col h-full">
                    <div class="overflow-auto flex-[1] [mask-image:linear-gradient(to_bottom,transparent,black_2%,black_98%,transparent)] pt-2 overflow-x-auto">
                        <div class="min-w-[600px]">
                            ${tournamentItemsHtml}
                            ${matchesHtml}
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
			console.error("Error rendering MatchHistory:", error);

			if (error instanceof Error && error.message.includes('No matches found for this player.')) {
				return this.renderEmptyState();
			} else {
				return this.renderErrorState();
			}
        }
    }

	private static renderEmptyState(): string {
		return /* HTML */`
			<div class="flex flex-col h-full justify-center items-center">
				<p class="text-gray-400">No match history.</p>
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
        const { players, userPlacement, isWin } = enrichedTournament;
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
        const otherPlayers = players.filter((p) => p.username !== currentUser.username);
        const otherPlayersHtml = otherPlayers.map((player) => /* HTML */ `
            <div class="flex flex-col items-center ml-6">
                <img src="${player.avatarUrl}" alt="${player.username} avatar" class="w-15 h-15 rounded-lg object-cover">
                <span class="text-white text-base mt-1">${player.username}</span>
            </div>
        `).join('');

        return /* HTML */ `
            <div class="flex items-stretch justify-between rounded-lg mb-2 overflow-hidden min-w-[600px]" style="background-color: ${bgColor}95;">
                <div class="flex items-center justify-between p-4 flex-grow">
                    <div class="flex items-center w-1/4">
                        <div>
                            <img src="${currentUser.avatarUrl}" alt="${currentUser.username} avatar" class="text-white w-20 h-20 rounded-lg object-cover">
                        </div>
                        <div class="ml-4">
                            <span class="text-white text-base">${currentUser.username}</span>
                        </div>
                    </div>
                    <div class="font-bold text-lg text-center w-1/4 flex flex-col justify-center items-center ml-14">
                        <span class="font-bold text-2xl" style="color: ${resultColor}">${resultText}</span>
                        <div>
                            <span class="w-8 text-center text-white font-bold text-xl">${userPlacement}${placementSuffix(userPlacement)}</span>
                        </div>
                    </div>
                    <div class="flex items-center justify-end w-1/2">
                        ${otherPlayersHtml}
                    </div>
                </div>
            </div>
        `;
    }

    private static async createMatchHistoryItem(enrichedMatch: EnrichedMatch, currentUser: any, userAvatar: string): Promise<string> {
		const { match, opponent, isWin } = enrichedMatch;
        const userScore = match.player1 === currentUser.wallet ? match.player1Score : match.player2Score;
        const opponentScore = match.player1 === currentUser.wallet ? match.player2Score : match.player1Score;
		const opponentUsername = opponent.username;
		const opponentAvatar = opponent.avatarUrl;

        const resultText = isWin ? 'VICTORY' : 'DEFEAT';
        const resultColor = isWin ? UI_THEME.colors.green.light : UI_THEME.colors.red.light;

        const bgColor = isWin ? UI_THEME.colors.green.dark : UI_THEME.colors.red.dark;

        return /* HTML */`
            <div class="flex items-stretch justify-between rounded-lg mb-2 overflow-hidden" style="background-color: ${bgColor}95;">
                <div class="flex items-center justify-between p-4 flex-grow">
                    <div class="flex items-center w-1/3">
                        <div>
                            <img src="${userAvatar}" alt="${currentUser.username} avatar" class="text-white w-10 h-10 rounded-lg object-cover">
                        </div>
                        <div class="ml-4">
                            <span class="text-white">${currentUser.username}</span>
                        </div>
                    </div>
                    <div class="font-bold text-lg text-center w-1/3 flex flex-col justify-center items-center">
                        <span class="font-bold text-2xl" style="color: ${resultColor}">${resultText}</span>
                        <div>
                            <span class="w-8 text-right text-white">${userScore ?? '?'}</span>
                            <span class="mx-2 text-white">-</span>
                            <span class="w-8 text-left text-white">${opponentScore ?? '?'}</span>
                        </div>
                    </div>
                    <div class="flex items-center justify-end w-1/3">
                        <div class="mr-4">
                            <span class="text-white">${opponentUsername}</span>
                        </div>
                        <div>
                            <img src="${opponentAvatar}" alt="${opponentUsername} avatar" class=" text-white w-10 h-10 rounded-lg object-cover">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
