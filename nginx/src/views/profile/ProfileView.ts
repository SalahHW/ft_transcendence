/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ProfileView.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/22 10:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/08 22:51:56 by edelarbr         ###   ########.fr       */
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

		this.render();
	}

	public render(): void {
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
		this.updateProfile();
		this.updateMatchHistory();
		this.updateFriendList();
	}

	public updateProfile(): void {
		console.log('Updating profile...');
		const profileContainer = this._contentContainer.querySelector('#profile');
		if (!profileContainer) {
			console.error('Profile container not found');
			return;
		}

		profileContainer.innerHTML = UserProfile.render();
	}

	public updateMatchHistory(): void {
		const matchHistoryContainer = this._contentContainer.querySelector('#match-history');
		if (!matchHistoryContainer) {
			console.error('Match history container not found');
			return;
		}

		matchHistoryContainer.innerHTML = MatchHistory.render();
	}

	public updateFriendList(): void {
		const friendListContainer = this._contentContainer.querySelector('#friends');
		if (!friendListContainer) {
			console.error('Friend list container not found');
			return;
		}

		friendListContainer.innerHTML = FriendList.render();
	}
}
