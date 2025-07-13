/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FriendList.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2024/05/26 21:09:59 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/13 18:08:00 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import FriendsService, { EnrichedFriend } from "../../../services/FriendsService.js";
import UsersApi from "../../../services/api/user.js";
import AuthNanoService from "../../../services/AuthNanoService.js";
import CacheManager from "../../../services/CacheManager.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";
import { createWinRateDonutChart } from "./WinRateDonutChart.js";

export class FriendList {
    private static isAddFriendExpanded: boolean = false;
    private static friends: EnrichedFriend[] = [];
    private static friendsService = FriendsService.getInstance();
    private static usersService = new UsersApi();
    private static isLoading: boolean = true;
    private static authNanoService = AuthNanoService.getInstance();
    private static cacheManager = CacheManager.getInstance();

    public static async render(): Promise<string> {
        try {
            if (this.friends.length === 0) {
                await this.loadFriends();
            }

            if (this.isLoading) {
                return this.renderLoadingState();
            }

            const friendsHtml = this.friends.map(friend => this.createFriendListItem(friend)).join('');
            return /* HTML */`
                <div class="flex flex-col gap-2 h-full">
                    <div class="overflow-auto flex-[1] [mask-image:linear-gradient(to_bottom,transparent,black_2%,black_98%,transparent)] pt-2">
                        ${friendsHtml.length > 0 ? friendsHtml : this.renderEmptyState()}
                    </div>
                    ${this.createAddFriendSection()}
                </div>
            `;
        } catch (error) {
            console.error('[FriendList] Error in render():', error);
			this.isLoading = false;
            return this.renderErrorState();
        }
    }

    private static renderLoadingState(): string {
        return /* HTML */`
            <div class="flex flex-col gap-2 h-full">
                <div class="overflow-auto flex-[1] flex items-center justify-center">
                    <div class="text-gray-400">Chargement des amis...</div>
                </div>
                ${this.createAddFriendSection()}
            </div>
        `;
    }

    private static renderEmptyState(): string {
        return /* HTML */`
            <div class="flex items-center justify-center h-full text-gray-400">
                <p>Aucun ami pour le moment</p>
            </div>
        `;
    }

    private static renderErrorState(): string {
        return /* HTML */`
            <div class="flex flex-col gap-2 h-full">
                <div class="overflow-auto flex-[1] flex items-center justify-center">
                    <div class="text-red-400">Erreur lors du chargement des amis</div>
                </div>
                ${this.createAddFriendSection()}
            </div>
        `;
    }

    private static async loadFriends(): Promise<void> {
		this.isLoading = true;
        try {
            this.friends = await this.friendsService.getEnrichedFriends();
        } catch (error) {
            console.error('Erreur lors du chargement des amis:', error);
            this.friends = [];
			throw error; // Renvoyer l'erreur pour que render() puisse l'attraper
        } finally {
            this.isLoading = false;
        }
    }

    private static createFriendListItem(friend: EnrichedFriend): string {
        const statusColor = friend.status === 'online' ? UI_THEME.colors.green.light : UI_THEME.colors.red.light;
        return /* HTML */`
            <div class="flex items-center justify-between p-2 rounded-lg mb-2 bg-black/20 overflow-hidden">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="relative flex-shrink-0">
                        <img src="${friend.avatarUrl}" alt="${friend.username} avatar" class="text-white w-12 h-12 rounded-lg object-cover">
                        <span class="absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-gray-800" style="background-color: ${statusColor}"></span>
                    </div>
                    <span class="text-white font-medium truncate">${friend.username}</span>
                </div>
                <div class="w-12 h-12 flex-shrink-0">
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

    private static async handleAddFriend(): Promise<void> {
        const friendUsernameInput = document.getElementById('friend-username-input') as HTMLInputElement;
        if (!friendUsernameInput) return;

        const username = friendUsernameInput.value.trim();
        if (!username) {
            friendUsernameInput.focus();
            return;
        }

        try {
            const jwtPayload = await this.authNanoService.getJwtPayload();
            const currentUserId = jwtPayload?.sub;

            if (!currentUserId) {
                console.error('Utilisateur non connecté');
                alert('Vous devez être connecté pour ajouter un ami');
                return;
            }

            let targetUser: any = null;
            try {
                targetUser = await this.usersService.getUserByUsername(username);
            } catch (error) {
                console.error('Erreur lors de la recherche de l\'utilisateur:', error);
                alert(`Utilisateur "${username}" introuvable`);
                return;
            }

            if (!targetUser || !targetUser.id) {
                console.error('Utilisateur invalide ou ID manquant');
                alert('Utilisateur invalide ou incomplet');
                return;
            }

            if (targetUser.id === currentUserId) {
                alert('Vous ne pouvez pas vous ajouter comme ami');
                return;
            }

            // Vérifier si l'amitié existe déjà
            const isAlreadyFriend = this.friends.some(friend => friend.id === targetUser.id);
            if (isAlreadyFriend) {
                alert(`${username} est déjà dans votre liste d'amis`);
                return;
            }

            await this.friendsService.addFriend(targetUser.id);

            await this.loadFriends();

            // Reset du formulaire
            friendUsernameInput.value = '';
            this.toggleAddFriendMode();

            const container = document.querySelector('.flex.flex-col.gap-2.h-full');
            if (container) {
                this.isLoading = true;
                this.friends = []; // Vider le cache local pour forcer le rechargement
                container.innerHTML = await this.render();
                this.addEventListeners();
            }

        }
        catch (error) {
            console.error('Erreur lors de l\'ajout de l\'ami:', error);
            if (error instanceof Error) {
                alert(`Erreur: ${error.message}`);
            }
            else {
                alert('Erreur lors de l\'ajout de l\'ami');
            }
        }
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

    public static async refreshFriends(): Promise<void> {
        await this.loadFriends();
        const container = document.querySelector('.flex.flex-col.gap-2.h-full');
        if (container) {
            container.innerHTML = await this.render();
            this.addEventListeners();
        }
    }

    public static forceRefreshAllCaches(): void {
        this.cacheManager.clearAllCaches();
        console.log('[FriendList] All caches cleared manually');
    }

    public static getCacheStats(): void {
        const stats = this.cacheManager.getStats();
        console.log('[FriendList] Cache stats:', stats);
    }
}
