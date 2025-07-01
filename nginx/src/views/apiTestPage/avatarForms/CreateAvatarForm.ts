import AvatarServiceAPI, { Avatar } from "../../../api/avatar.js";
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
					<input type="text" id="createform-avatar-url" placeholder="Avatar URL (optionnel si upload)" class="${UI_THEME.components.input}">
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
			const urlInput = document.getElementById("createform-avatar-url") as HTMLInputElement;
			const fileInput = document.getElementById("createform-avatar-file") as HTMLInputElement;
			if (!userIdInput.value || (!urlInput.value && !fileInput.files?.length)) {
				console.warn("Please provide a user ID and either an avatar URL or upload an image file");
				return;
			}
			const userId = parseInt(userIdInput.value);

			const handleAvatar = async (avatarUrl: string) => {
				const avatar: Avatar = { url: avatarUrl };
				try {
					const response = await this._avatarService.uploadUserAvatar(userId, avatar);
					form.reset();
					console.log(`Avatar uploaded:\n${JSON.stringify(response, null, 2)}`);
					const terminal = CustomTerminal["_instance"];
					if (terminal && typeof terminal.logImage === "function" && response.url) {
						terminal.logImage(response.url, "Avatar image");
					}
				} catch (error) {
					if (error instanceof Error)
						console.error(error.message);
					else
						console.error(error);
				}
			};

			if (fileInput.files && fileInput.files.length > 0) {
				const file = fileInput.files[0];
				const reader = new FileReader();
				reader.onload = async (e) => {
					const base64 = e.target?.result as string;
					await handleAvatar(base64);
				};
				reader.readAsDataURL(file);
			} else {
				await handleAvatar(urlInput.value);
			}
		});
	}
}
