/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FriendList.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/08 22:31:56 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { mockProfile } from "../../../api/mockProfile/mockProfile.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";
import { createWinRateDonutChart } from "./WinRateDonutChart.js";

export class FriendList {
    public static render(): string {
        const friendsHtml = mockProfile.friends.map(friend => this.createFriendListItem(friend)).join('');
        return /* HTML */`
            <div class="flex flex-col gap-2 h-full">
                <div class="overflow-auto flex-[1] [mask-image:linear-gradient(to_bottom,transparent,black_2%,black_98%,transparent)] pt-2">
                    ${friendsHtml}
                </div>
            </div>
        `;
    }

    private static createFriendListItem(friend: any): string {
        const statusColor = friend.status === 'online' ? UI_THEME.colors.green.light : UI_THEME.colors.red.light;
        return /* HTML */`
            <div class="flex items-center justify-between p-2 rounded-lg mb-2 bg-black/20">
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <img src="${friend.avatarUrl}" alt="${friend.username} avatar" class="text-white w-12 h-12 rounded-lg object-cover">
                        <span class="absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-gray-800" style="background-color: ${statusColor}"></span>
                    </div>
                    <span class="text-white font-medium">${friend.username}</span>
                </div>
                <div class="w-12 h-12">
                    ${createWinRateDonutChart({ wins: friend.wins, losses: friend.losses }, false)}
                </div>
            </div>
        `;
    }
}
