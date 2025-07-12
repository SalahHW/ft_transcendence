/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MatchHistory.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/13 00:56:06 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import MatchHistoryService from "../../../services/MatchHistoryService.js";
import UserProfileService from "../../../services/UserProfileService.js";
import AvatarServiceAPI from "../../../services/api/avatar.js";
import { Match } from "../../../services/api/match.js";
import { User } from "../../../services/api/user.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export class MatchHistory {

    private static _matchHistoryService = MatchHistoryService.getInstance();
    private static _userProfileService = UserProfileService.getInstance();
	private static _avatarApi = new AvatarServiceAPI();

    public static async render(): Promise<string> {
        try {
			const user = await this._userProfileService.getUserProfile();
			if (!user || !user.wallet) {
				console.error("User not authenticated or wallet address is missing.");
				return this.renderErrorState();
			}

            const matches = await this._matchHistoryService.getMatchHistory(user.wallet);

            if (matches.length === 0)
				return this.renderEmptyState();

            const matchesHtmlPromises = matches.map((match: Match) => this.createMatchHistoryItem(match, user));
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
			if (error instanceof Error) {
				console.error("Error name:", error.name);
				console.error("Error message:", error.message);
				if (error.stack) {
					console.error("Error stack:", error.stack);
				}
			}
			return this.renderErrorState();
        }
    }

	private static renderEmptyState(): string {
		return /* HTML */`
			<div class="flex flex-col h-full justify-center items-center">
				<p class="text-gray-400">Aucun historique de match.</p>
			</div>
		`;
	}

	private static renderErrorState(): string {
		return /* HTML */`
			<div class="flex flex-col h-full justify-center items-center">
				<p class="text-red-500">Erreur au chargement de l'historique des matchs.</p>
			</div>
		`;
	}

    private static async createMatchHistoryItem(match: Match, currentUser: User): Promise<string> {
        const isCurrentUserPlayer1 = match.player1 === currentUser.wallet;
        const userScore = isCurrentUserPlayer1 ? match.player1Score : match.player2Score;
        const opponentScore = isCurrentUserPlayer1 ? match.player2Score : match.player1Score;
        const opponentAddress = isCurrentUserPlayer1 ? match.player2 : match.player1;

        let opponentUsername = 'Unknown';
        if (opponentAddress) {
            try {
                opponentUsername = await this._matchHistoryService.getUserNameByAddress(opponentAddress);
            } catch (error) {
                console.error(`Could not fetch username for address: ${opponentAddress}`, error);
            }
        }

        const userWon = currentUser.wallet === match.winner;
        const resultText = userWon ? 'VICTORY' : 'DEFEAT';
        const resultColor = userWon ? UI_THEME.colors.green.light : UI_THEME.colors.red.light;

		let userAvatar = '/assets/defaultAvatar.jpg';
		try {
			if (currentUser.id)
				userAvatar = await this._avatarApi.getUserAvatarUrl(currentUser.id);
		} catch (error) { /* default avatar is already set */ }

        const opponentAvatar = '/assets/defaultAvatar.jpg';
        const bgColor = userWon ? UI_THEME.colors.green.dark : UI_THEME.colors.red.dark;

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
