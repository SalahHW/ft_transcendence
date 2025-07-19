import ModalView from "../../components/ModalView.js";
import { UserProfileView } from "./components/UserProfileView.js";
import { MatchHistoryView } from "./components/MatchHistoryView.js";
import { FriendListView } from "./components/FriendListView.js";

export default class ProfileView extends ModalView {

	constructor() {
		super({
			width: '70vw',
			height: '70vh'
		});
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
		await this.updateMatchHistory();
		await this.updateFriendList();
	}

	public async updateProfile(): Promise<void> {
		const profileContainer = this._contentContainer.querySelector('#profile');
		if (!profileContainer) {
			console.error('Profile container not found');
			return;
		}

		try {
			profileContainer.innerHTML = /* HTML */`
				<div class="flex items-center justify-center h-full">
					<div class="text-white">Chargement du profil...</div>
				</div>
			`;

			profileContainer.innerHTML = await UserProfileView.render();
			await UserProfileView.addEventListeners();
		} catch (error) {
			console.error('Error updating profile:', error);
			profileContainer.innerHTML = /* HTML */`
				<div class="flex items-center justify-center h-full">
					<div class="text-red-500">Erreur lors du chargement du profil</div>
				</div>
			`;
		}
	}

	public async updateMatchHistory(): Promise<void> {
		const matchHistoryContainer = this._contentContainer.querySelector('#match-history');
		if (!matchHistoryContainer) {
			console.error('Match history container not found');
			return;
		}

		await MatchHistoryView.render(matchHistoryContainer as HTMLElement);
	}

	public async updateFriendList(): Promise<void> {
		const friendListContainer = this._contentContainer.querySelector('#friends');
		if (!friendListContainer) {
			console.error('Friend list container not found');
			return;
		}

		friendListContainer.innerHTML = await FriendListView.render();
		FriendListView.addEventListeners();
	}
}
