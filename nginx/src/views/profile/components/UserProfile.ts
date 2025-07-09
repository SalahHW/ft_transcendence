/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   UserProfile.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/09 22:33:13 by edelarbr         ###   ########.fr       */
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
                    <div id="username-wrapper" class="flex items-center gap-2 mb-4">
                        <h2 class="text-4xl font-bold text-white">${mockProfile.user.username}</h2>
                    </div>
                    ${
                        mockProfile.user.authenticationMethod === "credentials" ?
                            `<div id="email-wrapper" class="flex items-center gap-2 mb-4">
                                <p class="text-gray-500">${mockProfile.user.email}</p>
                            </div>`
                            : ''
                    }
                    <div class="flex items-center gap-2 mb-4">
                        <p class="text-gray-500">${UserProfile.truncateWallet(mockProfile.user.wallet)}</p>
                    </div>
                </div>
                <div class="flex flex-col gap-2 p-4 w-12">
                    <button id="edit-profile-btn" class="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors duration-200">
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
        const editButton = document.getElementById('edit-profile-btn');
        const usernameWrapper = document.getElementById('username-wrapper');
        const emailWrapper = document.getElementById('email-wrapper'); // This can be null

        if (!editButton || !usernameWrapper) return;

        const editHandler = () => {
            const originalUsername = usernameWrapper.querySelector('h2')?.textContent || '';
            const originalEmail = emailWrapper?.querySelector('p')?.textContent || '';

            // --- Username Input ---
            const usernameH2 = usernameWrapper.querySelector('h2');
            if (usernameH2) {
                const h2Rect = usernameH2.getBoundingClientRect();
                usernameWrapper.innerHTML = `<input name="username" type="text" value="${originalUsername}" class="text-4xl font-bold text-white bg-black/20 border border-white/20 rounded-lg focus:outline-none focus:bg-black/30 w-full max-w-full transition-all duration-200 p-2">`;
                const usernameInput = usernameWrapper.querySelector('input');
                if (usernameInput) {
                    usernameInput.style.height = `${h2Rect.height}px`;
                    usernameInput.style.boxSizing = 'border-box';
                    usernameInput.focus();
                    usernameInput.setSelectionRange(originalUsername.length, originalUsername.length);
                }
            }

            // --- Email Input ---
            if (emailWrapper) {
                const emailP = emailWrapper.querySelector('p');
                if (emailP) {
                    const pRect = emailP.getBoundingClientRect();
                    emailWrapper.innerHTML = `<input name="email" type="email" value="${originalEmail}" class="text-gray-200 bg-black/20 border border-white/20 rounded-lg focus:outline-none focus:bg-black/30 w-full max-w-full transition-all duration-200 p-2 text-base">`;
                    const emailInput = emailWrapper.querySelector('input');
                    if (emailInput) {
                        emailInput.style.height = `${pRect.height}px`;
                        emailInput.style.boxSizing = 'border-box';
                    }
                }
            }

            editButton.innerHTML = '✔️';

            const finishEditing = (save: boolean) => {
                const usernameInput = usernameWrapper.querySelector('input[name="username"]') as HTMLInputElement;
                const newUsername = save && usernameInput?.value ? usernameInput.value : originalUsername;
                usernameWrapper.innerHTML = `<h2 class="text-4xl font-bold text-white">${newUsername}</h2>`;

                if (emailWrapper) {
                    const emailInput = emailWrapper.querySelector('input[name="email"]') as HTMLInputElement;
                    const newEmail = save && emailInput?.value ? emailInput.value : originalEmail;
                    emailWrapper.innerHTML = `<p class="text-gray-500">${newEmail}</p>`;
                }

                editButton.innerHTML = '✏️';
                editButton.removeEventListener('click', saveHandler);
                document.removeEventListener('keydown', keydownHandler);
                editButton.addEventListener('click', editHandler);
            };

            const saveHandler = () => finishEditing(true);
            const keydownHandler = (e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    finishEditing(true);
                }
                if (e.key === 'Escape') {
                    finishEditing(false);
                }
            };

            editButton.removeEventListener('click', editHandler);
            editButton.addEventListener('click', saveHandler, { once: true });
            document.addEventListener('keydown', keydownHandler);
        };

        editButton.addEventListener('click', editHandler);
    }
}
