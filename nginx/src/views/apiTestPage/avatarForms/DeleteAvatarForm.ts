import AvatarServiceAPI from "../../../api/avatar.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class DeleteAvatarForm {
	private _container: HTMLElement;
	private _avatarService: AvatarServiceAPI;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		this._avatarService = new AvatarServiceAPI();
		if (!this._container)
			throw new Error(`Container ${containerId} not found`);
	}

	render(): void {
		this._container.innerHTML = /* HTML */ `
			<form id="delete-avatar-form" class="${UI_THEME.components.form}">
				<div>
					<input type="number" id="deleteform-avatar-id" placeholder="User ID (required)" class="${UI_THEME.components.input}">
				</div>
				${buttonHTML({label: "Delete Avatar", type: "submit"})}
			</form>
		`;
		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("delete-avatar-form") as HTMLFormElement;
		form.addEventListener("submit", async (event) => {
			event.preventDefault();
			const idInput = document.getElementById("deleteform-avatar-id") as HTMLInputElement;
			if (!idInput.value) {
				console.warn("Please provide a user ID");
				return;
			}
			const userId = parseInt(idInput.value);
			try {
				await this._avatarService.deleteUserAvatar(userId);
				form.reset();
				console.log(`Avatar deleted for user ID: ${userId}`);
			} catch (error) {
				if (error instanceof Error)
					console.error(error.message);
				else
					console.error(error);
			}
		});
	}
}
