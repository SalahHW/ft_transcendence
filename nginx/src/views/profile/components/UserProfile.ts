/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   UserProfile.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/09 22:20:26 by edelarbr         ###   ########.fr       */
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
                <div class="flex-[2] rounded-lg p-4 flex flex-col justify-start items-start border border-red-500">
                    <div id="username-wrapper" class="flex items-center gap-2 mb-4 border border-blue-500">
                        <h2 class="text-4xl font-bold text-white">${mockProfile.user.username}</h2>
                    <div class="flex items-center gap-2 mb-4">
                        <p class="text-gray-500">${UserProfile.truncateWallet(mockProfile.user.wallet)}</p>
                    </div>
                    </div>
                    ${
                        mockProfile.user.authenticationMethod === "credentials" ?
                            `<div class="flex items-center gap-2 mb-4">
                                <p class="text-gray-500">${mockProfile.user.email}</p>
                            </div>`
                            : ''
                    }
                </div>
                <div class="flex flex-col gap-2 p-4 w-12 border border-green-500">
                    <button id="edit-username-btn" class="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors duration-200">
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

    public static addEventListeners(): void {
        const editButton = document.getElementById('edit-username-btn');
        const usernameWrapper = document.getElementById('username-wrapper');
        if (!editButton || !usernameWrapper) return;

        const originalUsername = usernameWrapper.querySelector('h2')?.textContent || '';

        const editHandler = () => {
            const h2 = usernameWrapper.querySelector('h2');
            if (!h2) return;

            const h2Rect = h2.getBoundingClientRect();
            const currentUsername = h2.textContent || '';

            usernameWrapper.innerHTML = `<input type="text" value="${currentUsername}" class="text-4xl font-bold text-white bg-black/20 border border-white/20 rounded-lg focus:outline-none focus:bg-black/30 w-full max-w-full transition-all duration-200 p-2">`;
            const input = usernameWrapper.querySelector('input');
            if (!input) return;

            input.style.height = `${h2Rect.height}px`;
            input.style.boxSizing = 'border-box';

            input.focus();
            input.setSelectionRange(currentUsername.length, currentUsername.length);

            editButton.innerHTML = '✔️';

            const finishEditing = (save: boolean) => {
                const finalUsername = save && input.value ? input.value : originalUsername;
                usernameWrapper.innerHTML = `<h2 class="text-4xl font-bold text-white">${finalUsername}</h2>`;

                editButton.innerHTML = '✏️';
                editButton.removeEventListener('click', saveHandler);
                input.removeEventListener('blur', blurHandler);
                input.removeEventListener('keydown', keydownHandler);
                editButton.addEventListener('click', editHandler);
            };

            const saveHandler = () => finishEditing(true);
            const blurHandler = () => {
                setTimeout(() => {
                    if (document.activeElement !== editButton) {
                        finishEditing(true);
                    }
                }, 100);
            };
            const keydownHandler = (e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    finishEditing(true);
                }
                if (e.key === 'Escape') finishEditing(false);
            };

            editButton.removeEventListener('click', editHandler);

            editButton.addEventListener('click', saveHandler, { once: true });
            input.addEventListener('blur', blurHandler, { once: true });
            input.addEventListener('keydown', keydownHandler);
        };

        editButton.addEventListener('click', editHandler);
    }
}
