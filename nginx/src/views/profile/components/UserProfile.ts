/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   UserProfile.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/10 00:03:42 by edelarbr         ###   ########.fr       */
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
                <div id="avatar-container" class="relative flex-[1] rounded-lg p-4 aspect-square">
                    <img id="avatar-img" src="${mockProfile.avatar.url}" alt="Profile Picture" class="w-full h-full object-cover text-white rounded-lg transition-all duration-300">
                    <div id="avatar-overlay" class="absolute inset-4 bg-black/50 rounded-lg flex items-center justify-center opacity-0 transition-opacity duration-300 cursor-pointer pointer-events-none">
						<svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="white" stroke-linecap="round" stroke-width="1.5"><path d="M17 9.002c2.175.012 3.353.109 4.121.877C22 10.758 22 12.172 22 15v1c0 2.829 0 4.243-.879 5.122C20.243 22 18.828 22 16 22H8c-2.828 0-4.243 0-5.121-.878C2 20.242 2 18.829 2 16v-1c0-2.828 0-4.242.879-5.121c.768-.768 1.946-.865 4.121-.877" opacity=".5"/><path stroke-linejoin="round" d="M12 15V2m0 0l3 3.5M12 2L9 5.5"/></g></svg>
                    </div>
					<input type="file" id="avatar-upload-input" class="hidden" accept="image/*">
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
        const avatarContainer = document.getElementById('avatar-container');
        const avatarImg = document.getElementById('avatar-img') as HTMLImageElement;
        const avatarOverlay = document.getElementById('avatar-overlay');
        const avatarUploadInput = document.getElementById('avatar-upload-input') as HTMLInputElement;

        if (!editButton || !usernameWrapper || !avatarContainer || !avatarImg || !avatarOverlay || !avatarUploadInput) return;

        const originalAvatarSrc = avatarImg.src;
        let newAvatarFile: File | null = null;
        let objectUrlToRevoke: string | null = null;

        const handleAvatarClick = () => avatarUploadInput.click();

        const handleFileSelect = () => {
            if (avatarUploadInput.files && avatarUploadInput.files[0]) {
                newAvatarFile = avatarUploadInput.files[0];
                if (objectUrlToRevoke) {
                    URL.revokeObjectURL(objectUrlToRevoke);
                }
                objectUrlToRevoke = URL.createObjectURL(newAvatarFile);
                avatarImg.src = objectUrlToRevoke;
            }
        };

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

            // --- Avatar Edit Mode ---
            avatarImg.style.filter = 'brightness(50%)';
            avatarOverlay.style.opacity = '1';
            avatarOverlay.style.pointerEvents = 'auto';
            avatarOverlay.addEventListener('click', handleAvatarClick);
            avatarUploadInput.addEventListener('change', handleFileSelect);

            editButton.innerHTML = '✔️';

            const finishEditing = (save: boolean) => {
                // --- Username ---
                const usernameInput = usernameWrapper.querySelector('input[name="username"]') as HTMLInputElement;
                const newUsername = save && usernameInput?.value ? usernameInput.value : originalUsername;
                usernameWrapper.innerHTML = `<h2 class="text-4xl font-bold text-white">${newUsername}</h2>`;

                // --- Email ---
                if (emailWrapper) {
                    const emailInput = emailWrapper.querySelector('input[name="email"]') as HTMLInputElement;
                    const newEmail = save && emailInput?.value ? emailInput.value : originalEmail;
                    emailWrapper.innerHTML = `<p class="text-gray-500">${newEmail}</p>`;
                }

                // --- Avatar ---
                avatarImg.style.filter = 'brightness(100%)';
                avatarOverlay.style.opacity = '0';
                avatarOverlay.style.pointerEvents = 'none';
                avatarOverlay.removeEventListener('click', handleAvatarClick);
                avatarUploadInput.removeEventListener('change', handleFileSelect);

                if (save) {
                    // In a real app, you'd upload newAvatarFile here if it's not null.
                    // For now, the new image preview remains. We'll clear the old object URL if a new save happens.
                    if (newAvatarFile) {
                        // `objectUrlToRevoke` for the saved image should be kept until the next change or page unload.
                    }
                } else {
                    // Revert to original image if canceled
                    avatarImg.src = originalAvatarSrc;
                    if (objectUrlToRevoke) {
                        URL.revokeObjectURL(objectUrlToRevoke);
                        objectUrlToRevoke = null;
                    }
                    newAvatarFile = null;
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
