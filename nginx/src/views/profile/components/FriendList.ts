/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FriendList.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/11 15:14:15 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { mockProfile } from "../../../services/api/mockProfile/mockProfile.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";
import { createWinRateDonutChart } from "./WinRateDonutChart.js";

export class FriendList {
    private static isAddFriendExpanded: boolean = false;

    public static render(): string {
        const friendsHtml = mockProfile.friends.map((friend: any) => this.createFriendListItem(friend)).join('');
        return /* HTML */`
            <div class="flex flex-col gap-2 h-full">
                <div class="overflow-auto flex-[1] [mask-image:linear-gradient(to_bottom,transparent,black_2%,black_98%,transparent)] pt-2">
                    ${friendsHtml}
                </div>
                ${this.createAddFriendSection()}
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

    private static createAddFriendSection(): string {
        if (this.isAddFriendExpanded) {
            return /* HTML */`
                <div id="add-friend-container" class="${UI_THEME.components.friendList.addFriendContainer}">
                    <input
                        id="friend-username-input"
                        type="text"
                        placeholder="Nom d'utilisateur..."
                        class="${UI_THEME.components.friendList.addFriendInput}"
                    >
                    <button id="add-friend-btn" class="${UI_THEME.components.friendList.addFriendButton}">
                        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path fill="currentColor" d="M11 13H6q-.425 0-.712-.288T5 12t.288-.712T6 11h5V6q0-.425.288-.712T12 5t.713.288T13 6v5h5q.425 0 .713.288T19 12t-.288.713T18 13h-5v5q0 .425-.288.713T12 19t-.712-.288T11 18z"/>
                        </svg>
                    </button>
                </div>
            `;
        } else {
            return /* HTML */`
                <div id="add-friend-container" class="flex justify-end mt-2">
                    <button id="add-friend-btn" class="${UI_THEME.components.friendList.addFriendButtonCollapsed}">
                        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path fill="currentColor" d="M11 13H6q-.425 0-.712-.288T5 12t.288-.712T6 11h5V6q0-.425.288-.712T12 5t.713.288T13 6v5h5q.425 0 .713.288T19 12t-.288.713T18 13h-5v5q0 .425-.288.713T12 19t-.712-.288T11 18z"/>
                        </svg>
                    </button>
                </div>
            `;
        }
    }

    public static addEventListeners(): void {
        this.updateAddFriendEventListeners();
    }

    private static updateAddFriendEventListeners(): void {
        const addFriendBtn = document.getElementById('add-friend-btn');
        const friendUsernameInput = document.getElementById('friend-username-input') as HTMLInputElement;

        if (!addFriendBtn) return;

        // Supprimer les anciens event listeners
        addFriendBtn.replaceWith(addFriendBtn.cloneNode(true));
        const newAddFriendBtn = document.getElementById('add-friend-btn');
        if (!newAddFriendBtn) return;

        if (this.isAddFriendExpanded) {
            // Mode étendu : le bouton confirme l'ajout ou l'input envoie le formulaire
            newAddFriendBtn.addEventListener('click', () => this.handleAddFriend());

            if (friendUsernameInput) {
                friendUsernameInput.focus();
                friendUsernameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleAddFriend();
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        friendUsernameInput.value = '';
                        this.toggleAddFriendMode();
                    }
                });
            }
        } else {
            // Mode réduit : le bouton ouvre le champ d'input
            newAddFriendBtn.addEventListener('click', () => this.toggleAddFriendMode());
        }
    }

    private static toggleAddFriendMode(): void {
        this.isAddFriendExpanded = !this.isAddFriendExpanded;
        this.refreshAddFriendSection();
    }

    private static handleAddFriend(): void {
        const friendUsernameInput = document.getElementById('friend-username-input') as HTMLInputElement;
        if (!friendUsernameInput) return;

        const username = friendUsernameInput.value.trim();
        if (!username) {
            friendUsernameInput.focus();
            return;
        }

        // Ici vous pourrez ajouter la logique pour ajouter réellement l'ami
        console.log(`Tentative d'ajout de l'ami : ${username}`);

        // Reset du formulaire
        friendUsernameInput.value = '';
        this.toggleAddFriendMode();
    }

    private static refreshAddFriendSection(): void {
        const container = document.getElementById('add-friend-container');
        if (!container) return;

        const newSection = document.createElement('div');
        newSection.innerHTML = this.createAddFriendSection();
        const newContainer = newSection.firstElementChild;

        if (newContainer) {
            container.replaceWith(newContainer);
            this.updateAddFriendEventListeners();
        }
    }
}
