import AvatarServiceAPI from "../../../services/api/avatar.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";
import CustomTerminal from "../components/customTerminal.js";

export default class CreateAvatarForm {
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
			<form id="create-avatar-form" class="${UI_THEME.components.form}">
				<div>
					<input type="number" id="createform-avatar-userid" placeholder="User ID (required)" class="${UI_THEME.components.input}">
				</div>
				<div>
					<input type="file" id="createform-avatar-file" accept="image/*" class="${UI_THEME.components.input}">
				</div>
				${buttonHTML({label: "Upload Avatar", type: "submit"})}
			</form>
		`;
		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("create-avatar-form") as HTMLFormElement;
		form.addEventListener("submit", async (event) => {
			event.preventDefault();
			const userIdInput = document.getElementById("createform-avatar-userid") as HTMLInputElement;
			const fileInput = document.getElementById("createform-avatar-file") as HTMLInputElement;
			if (!userIdInput.value || !fileInput.files?.length) {
				console.warn("Please provide a user ID and upload an image file");
				return;
			}
			const userId = parseInt(userIdInput.value);
			const file = fileInput.files[0];
			try {
				await this._avatarService.uploadUserAvatar(userId, file);
				form.reset();
				console.log(`Avatar uploaded for user ID: ${userId}`);
				const terminal = CustomTerminal["_instance"];
				if (terminal && typeof terminal.logImage === "function") {
					const url = await this._avatarService.getUserAvatarUrl(userId);
					terminal.logImage(url, "Avatar image");
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
