import FriendsServiceAPI from "../../../services/api/friends.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class DeleteFriendshipForm {
	private _container: HTMLElement;
	private _friendsService: FriendsServiceAPI;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		this._friendsService = new FriendsServiceAPI();
		if (!this._container)
			throw new Error(`Container ${containerId} not found`);
	}

	render(): void {
		this._container.innerHTML = /* HTML */ `
			<form id="delete-friendship-form" class="${UI_THEME.components.form}">
				<div>
					<input type="number" id="deleteform-friendship-userid" placeholder="User ID (required)" class="${UI_THEME.components.input}">
				</div>
				<div>
					<input type="number" id="deleteform-friendship-friendid" placeholder="Friend ID (required)" class="${UI_THEME.components.input}">
				</div>
				${buttonHTML({label: "Delete Friendship", type: "submit"})}
			</form>
		`;
		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("delete-friendship-form") as HTMLFormElement;
		form.addEventListener("submit", async (event) => {
			event.preventDefault();
			const userIdInput = document.getElementById("deleteform-friendship-userid") as HTMLInputElement;
			const friendIdInput = document.getElementById("deleteform-friendship-friendid") as HTMLInputElement;

			if (!userIdInput.value || !friendIdInput.value) {
				console.warn("Please provide both User ID and Friend ID");
				return;
			}

			const userId = parseInt(userIdInput.value);
			const friendId = parseInt(friendIdInput.value);

			try {
				await this._friendsService.deleteFriendship(userId, friendId);
				form.reset();
				console.log(`Friendship deleted between user ${userId} and user ${friendId}`);
			} catch (error) {
				if (error instanceof Error)
					console.error(error.message);
				else
					console.error(error);
			}
		});
	}
}
