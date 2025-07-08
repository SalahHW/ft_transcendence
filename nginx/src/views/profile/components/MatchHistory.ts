/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MatchHistory.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/08 22:31:56 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { mockProfile } from "../../../api/mockProfile/mockProfile.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export class MatchHistory {
    public static render(): string {
        const matchesHtml = mockProfile.matches.matches.map(match => this.createMatchHistoryItem(match)).join('');
        return /* HTML */`
            <div class="flex flex-col h-full">
                <div class="overflow-auto flex-[1] [mask-image:linear-gradient(to_bottom,transparent,black_2%,black_98%,transparent)] pt-2">
                    ${matchesHtml}
                </div>
            </div>
        `;
    }

    private static createMatchHistoryItem(match: any): string {
        const userWon = match.score.user > match.score.opponent;
        const resultText = userWon ? 'VICTORY' : 'DEFEAT';
        const resultColor = userWon ? UI_THEME.colors.green.light : UI_THEME.colors.red.light;
        const userAvatar = mockProfile.avatar.url || '/assets/defaultAvatar.jpg';
        const opponentAvatar = match.opponent.avatarUrl || '/assets/defaultAvatar.jpg';
        const bgColor = userWon ? UI_THEME.colors.green.dark : UI_THEME.colors.red.dark;

        return /* HTML */`
            <div class="flex items-center justify-between p-4 rounded-lg mb-2" style="background-color: ${bgColor}95;">
                <div class="flex items-center w-1/3">
                    <div>
                        <img src="${userAvatar}" alt="${mockProfile.user.username} avatar" class="text-white w-16 h-16 rounded-lg object-cover">
                    </div>
                    <div class="ml-4">
                        <span class="text-white">${mockProfile.user.username}</span>
                    </div>
                </div>
                <div class="font-bold text-lg text-center w-1/3 flex flex-col justify-center items-center">
                    <span class="font-bold text-2xl" style="color: ${resultColor}">${resultText}</span>
                    <div>
                        <span class="w-8 text-right text-white">${match.score.user}</span>
                        <span class="mx-2 text-white">-</span>
                        <span class="w-8 text-left text-white">${match.score.opponent}</span>
                    </div>
                </div>
                <div class="flex items-center justify-end w-1/3">
                    <div class="mr-4">
                        <span class="text-white">${match.opponent.username}</span>
                    </div>
                    <div>
                        <img src="${opponentAvatar}" alt="${match.opponent.username} avatar" class=" text-white w-16 h-16 rounded-lg object-cover">
                    </div>
                </div>
            </div>
        `;
    }
}
