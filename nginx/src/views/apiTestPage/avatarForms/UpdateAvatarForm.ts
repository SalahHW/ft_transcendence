import AvatarServiceAPI from "../../../services/api/avatar.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";
import CustomTerminal from "../components/customTerminal.js";

export default class UpdateAvatarForm {
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
			<form id="update-avatar-form" class="${UI_THEME.components.form}">
				<div>
					<input type="number" id="updateform-avatar-id" placeholder="User ID (required)" class="${UI_THEME.components.input}">
				</div>
				<div>
					<input type="file" id="updateform-avatar-file" accept="image/*" class="${UI_THEME.components.input}">
				</div>
				${buttonHTML({label: "Update Avatar", type: "submit"})}
			</form>
		`;
		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("update-avatar-form") as HTMLFormElement;
		form.addEventListener("submit", async (event) => {
			event.preventDefault();
			const idInput = document.getElementById("updateform-avatar-id") as HTMLInputElement;
			const fileInput = document.getElementById("updateform-avatar-file") as HTMLInputElement;
			if (!idInput.value || !fileInput.files?.length) {
				console.warn("Please provide a user ID and upload an image file");
				return;
			}
			const file = fileInput.files[0];
			try {
				await this._avatarService.updateUserAvatar(file);
				form.reset();
				console.log(`Avatar updated for user ID: ${idInput.value}`);
				const terminal = CustomTerminal["_instance"];
				if (terminal && typeof terminal.logImage === "function") {
					const url = await this._avatarService.getUserAvatarUrl(parseInt(idInput.value));
					terminal.logImage(url, `Avatar image for user ID: ${idInput.value}`);
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
