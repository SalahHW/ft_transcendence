import FriendsServiceAPI from "../../../services/api/friends.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class CreateFriendshipForm {
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
			<form id="create-friendship-form" class="${UI_THEME.components.form}">
				<div>
					<input type="number" id="createform-friendship-userid" placeholder="User ID (required)" class="${UI_THEME.components.input}">
				</div>
				<div>
					<input type="number" id="createform-friendship-friendid" placeholder="Friend ID (required)" class="${UI_THEME.components.input}">
				</div>
				${buttonHTML({label: "Create Friendship", type: "submit"})}
			</form>
		`;
		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("create-friendship-form") as HTMLFormElement;
		form.addEventListener("submit", async (event) => {
			event.preventDefault();
			const userIdInput = document.getElementById("createform-friendship-userid") as HTMLInputElement;
			const friendIdInput = document.getElementById("createform-friendship-friendid") as HTMLInputElement;

			if (!userIdInput.value || !friendIdInput.value) {
				console.warn("Please provide both User ID and Friend ID");
				return;
			}

			const friendId = parseInt(friendIdInput.value);

			try {
				await this._friendsService.createFriendship(friendId);
				form.reset();
				console.log(`Friendship created between user ${userIdInput.value} and user ${friendIdInput.value}`);
			} catch (error) {
				if (error instanceof Error)
					console.error(error.message);
				else
					console.error(error);
			}
		});
	}
}
