import FriendsServiceAPI from "../../../services/api/friends.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class GetFriendshipsForm {
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
			<form id="get-friendships-form" class="${UI_THEME.components.form}">
				<div>
					<input type="number" id="getform-friendship-userid" placeholder="User ID (required)" class="${UI_THEME.components.input}">
				</div>
				${buttonHTML({label: "Get Friendships", type: "submit"})}
			</form>
		`;
		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("get-friendships-form") as HTMLFormElement;
		form.addEventListener("submit", async (event) => {
			event.preventDefault();
			const userIdInput = document.getElementById("getform-friendship-userid") as HTMLInputElement;

			if (!userIdInput.value) {
				console.warn("Please provide a User ID");
				return;
			}

			try {
				const friendships = await this._friendsService.getUserFriendships();
				console.log(`Friendships for user ${userIdInput.value}:`, friendships);
				if (friendships.length === 0) {
					console.log("No friendships found for this user.");
				}
			} catch (error) {
				if (error instanceof Error)
					console.error(error.message);
				else
					console.error(error);
			}
		});
	}
}
