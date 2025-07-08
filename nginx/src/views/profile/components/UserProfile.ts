/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   UserProfile.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/08 22:31:56 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { mockProfile } from "../../../api/mockProfile/mockProfile.js";
import { createWinRateDonutChart } from "./WinRateDonutChart.js";

export class UserProfile {
    public static render(): string {
        return /* HTML */`
            <div class="flex gap-2 h-full">
                <div class="flex-[1] rounded-lg p-4 aspect-square">
                    <img src="${mockProfile.avatar.url}" alt="Profile Picture" class="w-full h-full object-cover text-white rounded-lg">
                </div>
                <div class="flex-[2] rounded-lg p-4 flex flex-col justify-start items-start">
                    <h2 class="text-4xl font-bold text-white">${mockProfile.user.username}</h2>
                    <p class="text-gray-500">${mockProfile.user.email}</p>
                </div>
                <div class="flex-[1] rounded-lg p-4">
                    ${createWinRateDonutChart({
                        wins: mockProfile.matches.totalwins,
                        losses: mockProfile.matches.totallosses
                    })}
                </div>
            </div>
        `;
    }
}
