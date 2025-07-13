import MatchHistoryService, { EnrichedMatch, EnrichedMatchHistory } from "../../../services/MatchHistoryService.js";
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

            const enrichedHistory: EnrichedMatchHistory = await this._matchHistoryService.getEnrichedMatchHistory(user.wallet);
			const { enrichedMatches, currentUserAvatarUrl } = enrichedHistory;


            if (enrichedMatches.length === 0)
				return this.renderEmptyState();

            const matchesHtmlPromises = enrichedMatches.map((enrichedMatch: EnrichedMatch) => this.createMatchHistoryItem(enrichedMatch, user, currentUserAvatarUrl));
            const matchesHtml = (await Promise.all(matchesHtmlPromises)).join('');
            return /* HTML */`
                <div class="flex flex-col h-full">
                    <div class="overflow-auto flex-[1] [mask-image:linear-gradient(to_bottom,transparent,black_2%,black_98%,transparent)] pt-2">
                        ${matchesHtml}
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
                            <img src="${userAvatar}" alt="${currentUser.username} avatar" class="text-white w-16 h-16 rounded-lg object-cover">
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
                            <img src="${opponentAvatar}" alt="${opponentUsername} avatar" class=" text-white w-16 h-16 rounded-lg object-cover">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
