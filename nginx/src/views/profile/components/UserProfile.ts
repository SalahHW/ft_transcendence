/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   UserProfile.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/09 15:17:05 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { mockProfile } from "../../../api/mockProfile/mockProfile.js";
import { createWinRateDonutChart } from "./WinRateDonutChart.js";

export class UserProfile {
    private static truncateWallet(wallet: string): string {
        if (!wallet || wallet.length <= 10) return wallet;
        return `${wallet.slice(0, 5)}...${wallet.slice(-5)}`;
    }

    public static render(): string {
        return /* HTML */`
            <div class="flex gap-2 h-full overflow-auto">
                <div class="flex-[1] rounded-lg p-4 aspect-square">
                    <img src="${mockProfile.avatar.url}" alt="Profile Picture" class="w-full h-full object-cover text-white rounded-lg">
                </div>
                <div class="flex-[2] rounded-lg p-4 flex flex-col justify-start items-start">
                    <div class="flex items-center gap-2 mb-4">
                        <h2 class="text-4xl font-bold text-white">${mockProfile.user.username}</h2>
                    </div>
                    ${
                        mockProfile.user.authenticationMethod === "credentials" ?
                            `<div class="flex items-center gap-2 mb-4">
                                <p class="text-gray-500">${mockProfile.user.email}</p>
                            </div>`
                            : ''
                    }
                    <div class="flex items-center gap-2 mb-4">
                        <p class="text-gray-500">${UserProfile.truncateWallet(mockProfile.user.wallet)}</p>
                    </div>
                </div>
                <div class="flex flex-col gap-2 p-4 w-12">
                    <button class="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors duration-200">
                        ✏️
                    </button>
                </div>
                <div class="flex-[1] rounded-lg p-4 aspect-square flex">
                    ${createWinRateDonutChart({
                        wins: mockProfile.matches.totalwins,
                        losses: mockProfile.matches.totallosses
                    })}
                </div>
            </div>
        `;
    }
}
