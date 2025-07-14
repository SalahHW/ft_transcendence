import FriendsService, { EnrichedFriend } from "../../../services/FriendsService.js";
import UsersApi from "../../../services/api/user.js";
import AuthService from "../../../services/AuthNanoService.js";
import CacheManager from "../../../services/CacheManager.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";
import { createWinRateDonutChart } from "./WinRateDonutChart.js";
import PresenceService, { PresenceCallback } from "../../../services/webSocket/PresenceService.js";


export class FriendListView {
    private static isAddFriendExpanded: boolean = false;
    private static friends: EnrichedFriend[] = [];
    private static friendsService = FriendsService.getInstance();
    private static usersService = new UsersApi();
    private static isLoading: boolean = true;
    private static authNanoService = AuthService.getInstance();
    private static cacheManager = CacheManager.getInstance();
    private static presenceService = PresenceService.getInstance();
    private static presenceCallback: PresenceCallback | null = null;

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
                    <div class="text-gray-400">Loading friends...</div>
                </div>
                ${this.createAddFriendSection()}
            </div>
        `;
    }

    private static renderEmptyState(): string {
        return /* HTML */`
            <div class="flex items-center justify-center h-full text-gray-400">
                <p>No friends yet</p>
            </div>
        `;
    }

    private static renderErrorState(): string {
        return /* HTML */`
            <div class="flex flex-col gap-2 h-full">
                <div class="overflow-auto flex-[1] flex items-center justify-center">
                    <div class="text-red-400">Error loading friends</div>
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
            console.error('Error loading friends:', error);
            this.friends = [];
			throw error;
        } finally {
            this.isLoading = false;
        }
    }

    private static createFriendListItem(friend: EnrichedFriend): string {
        const isOnline = this.presenceService.isUserOnline(friend.id);
        const statusColor = isOnline ? UI_THEME.colors.green.light : UI_THEME.colors.red.light;

        return /* HTML */`
            <div data-friend-id="${friend.id}" class="flex items-center justify-between p-2 rounded-lg mb-2 bg-black/20 overflow-hidden">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="relative flex-shrink-0">
                        <img src="${friend.avatarUrl}" alt="${friend.username} avatar" class="text-white w-12 h-12 rounded-lg object-cover">
                        <span class="status-indicator absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-gray-800" style="background-color: ${statusColor}"></span>
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
                        placeholder="Username..."
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
        this.setupPresenceListener();
    }

    private static setupPresenceListener(): void {
        if (this.presenceCallback) {
            this.presenceService.offPresenceChange(this.presenceCallback);
        }

        this.presenceCallback = (userId, status) => {
            this.updateFriendStatus(userId, status);
        };

        this.presenceService.onPresenceChange(this.presenceCallback);
    }

    private static updateFriendStatus(userId: number, status: 'online' | 'offline'): void {
        const friendElement = document.querySelector(`[data-friend-id="${userId}"]`);
        if (!friendElement) return;

        const statusIndicator = friendElement.querySelector('.status-indicator');
        if (statusIndicator) {
            const statusColor = status === 'online'
                ? UI_THEME.colors.green.light
                : UI_THEME.colors.red.light;
            (statusIndicator as HTMLElement).style.backgroundColor = statusColor;
        }
    }

    private static updateAddFriendEventListeners(): void {
        const addFriendBtn = document.getElementById('add-friend-btn');
        const friendUsernameInput = document.getElementById('friend-username-input') as HTMLInputElement;

        if (!addFriendBtn) return;

        addFriendBtn.replaceWith(addFriendBtn.cloneNode(true));
        const newAddFriendBtn = document.getElementById('add-friend-btn');
        if (!newAddFriendBtn) return;

        if (this.isAddFriendExpanded) {
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
                console.error('User not logged in');
                alert('You must be logged in to add a friend');
                return;
            }

            let targetUser: any = null;
            try {
                targetUser = await this.usersService.getUserByUsername(username);
            } catch (error) {
                console.error('Error searching for user:', error);
                alert(`User "${username}" not found`);
                return;
            }

            if (!targetUser || !targetUser.id) {
                console.error('Invalid user or missing ID');
                alert('Invalid or incomplete user');
                return;
            }

            if (targetUser.id === currentUserId) {
                alert("You can't add yourself as a friend");
                return;
            }

            const isAlreadyFriend = this.friends.some(friend => friend.id === targetUser.id);
            if (isAlreadyFriend) {
                alert(`${username} is already in your friends list`);
                return;
            }

            await this.friendsService.addFriend(targetUser.id);

            await this.loadFriends();

            friendUsernameInput.value = '';
            this.toggleAddFriendMode();

            const container = document.querySelector('.flex.flex-col.gap-2.h-full');
            if (container) {
                this.isLoading = true;
                this.friends = [];
                container.innerHTML = await this.render();
                this.addEventListeners();
            }

        }
        catch (error) {
            console.error('Error adding friend:', error);
            if (error instanceof Error) {
                alert(`Error: ${error.message}`);
            }
            else {
                alert('Error adding friend');
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

    public static cleanup(): void {
        if (this.presenceCallback) {
            this.presenceService.offPresenceChange(this.presenceCallback);
            this.presenceCallback = null;
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
