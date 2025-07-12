/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MatchHistory.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/12 21:13:45 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import MatchHistoryService from "../../../services/MatchHistoryService.js";
import UserProfileService from "../../../services/UserProfileService.js";
import { Match } from "../../../services/api/match.js";
import { User } from "../../../services/api/user.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export class MatchHistory {

    private static _matchHistoryService = MatchHistoryService.getInstance();
    private static _userProfileService = UserProfileService.getInstance();

    public static async render(): Promise<string> {
        try {
            const [matches, user] = await Promise.all([
                this._matchHistoryService.getMatchHistory(),
                this._userProfileService.getUserProfile()
            ]);

            if (matches.length === 0) {
                return /* HTML */`
                    <div class="flex flex-col h-full justify-center items-center">
                        <p class="text-white">No match history found.</p>
                    </div>
                `;
            }
            const matchesHtml = matches.map((match: Match) => this.createMatchHistoryItem(match, user)).join('');
            return /* HTML */`
                <div class="flex flex-col h-full">
                    <div class="overflow-auto flex-[1] [mask-image:linear-gradient(to_bottom,transparent,black_2%,black_98%,transparent)] pt-2">
                        ${matchesHtml}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error("Error rendering MatchHistory:", error);
            return /* HTML */`
                <div class="flex flex-col h-full justify-center items-center">
                    <p class="text-red-500">Error loading match history.</p>
                </div>
            `;
        }
    }

    private static createMatchHistoryItem(match: Match, currentUser: User): string {
        const isPlayer1 = match.player1 === currentUser.username;
        const userScore = isPlayer1 ? match.player1Score : match.player2Score;
        const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
        const opponentUsername = isPlayer1 ? match.player2 : match.player1;

        const userWon = currentUser.wallet === match.winner;
        const resultText = userWon ? 'VICTORY' : 'DEFEAT';
        const resultColor = userWon ? UI_THEME.colors.green.light : UI_THEME.colors.red.light;
        const userAvatar = '/assets/defaultAvatar.jpg';
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
                            <span class="w-8 text-right text-white">${userScore}</span>
                            <span class="mx-2 text-white">-</span>
                            <span class="w-8 text-left text-white">${opponentScore}</span>
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
