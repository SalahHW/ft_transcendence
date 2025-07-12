/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ProfileView.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/22 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/12 21:01:46 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import ModalView from "../../components/ModalView.js";
import { UserProfile } from "./components/UserProfile.js";
import { MatchHistory } from "./components/MatchHistory.js";
import { FriendList } from "./components/FriendList.js";

export default class ProfileView extends ModalView {

	constructor() {
		super({
			width: '70vw',
			height: '70vh'
		});

		// Initialize asynchronously after construction
		this.init();
	}

	private async init(): Promise<void> {
		await this.render();
	}

	public async render(): Promise<void> {
		this._contentContainer.innerHTML = /* HTML */`
			<div class="flex h-full w-full overflow-auto min-h-0">
				<div class="relative flex flex-[4] flex-col gap-2 p-2 after:absolute after:right-0 after:top-[5%] after:h-[90%] after:w-px after:bg-white/20">
					<div class="relative flex-[1] rounded-2xl p-4 after:absolute after:bottom-0 after:left-[5%] after:h-px after:w-[90%] after:bg-white/20" id="profile"></div>
					<div class="flex-[3] rounded-2xl min-h-0" id="match-history"></div>
				</div>
				<div class="flex-[2]">
					<div class="h-full rounded-2xl p-4 overflow-y-auto" id="friends"></div>
				</div>
			</div>
		`;
		await this.updateProfile();
		this.updateMatchHistory();
		await this.updateFriendList();
	}

	public async updateProfile(): Promise<void> {
		const profileContainer = this._contentContainer.querySelector('#profile');
		if (!profileContainer) {
			console.error('Profile container not found');
			return;
		}

		try {
			// Afficher un loader pendant le chargement
			profileContainer.innerHTML = /* HTML */`
				<div class="flex items-center justify-center h-full">
					<div class="text-white">Chargement du profil...</div>
				</div>
			`;

			// Charger et afficher le profil
			profileContainer.innerHTML = await UserProfile.render();
			await UserProfile.addEventListeners();
		} catch (error) {
			console.error('Error updating profile:', error);
			profileContainer.innerHTML = /* HTML */`
				<div class="flex items-center justify-center h-full">
					<div class="text-red-500">Erreur lors du chargement du profil</div>
				</div>
			`;
		}
	}

	public updateMatchHistory(): void {
		const matchHistoryContainer = this._contentContainer.querySelector('#match-history');
		if (!matchHistoryContainer) {
			console.error('Match history container not found');
			return;
		}

		matchHistoryContainer.innerHTML = MatchHistory.render();
	}

	public async updateFriendList(): Promise<void> {
		const friendListContainer = this._contentContainer.querySelector('#friends');
		if (!friendListContainer) {
			console.error('Friend list container not found');
			return;
		}

		friendListContainer.innerHTML = await FriendList.render();
		FriendList.addEventListeners();
	}
}
