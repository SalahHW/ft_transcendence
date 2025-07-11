import AvatarServiceAPI from "../../../services/api/avatar.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";
import CustomTerminal from "../components/customTerminal.js";

export default class GetAvatarForm {
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
			<form id="get-avatar-form" class="${UI_THEME.components.form}">
				<div>
					<input type="number" id="getform-avatar-id" placeholder="User ID (required)" class="${UI_THEME.components.input}">
				</div>
				${buttonHTML({label: "Get Avatar", type: "submit"})}
			</form>
		`;
		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("get-avatar-form") as HTMLFormElement;
		form.addEventListener("submit", async (event) => {
			event.preventDefault();
			const idInput = document.getElementById("getform-avatar-id") as HTMLInputElement;
			if (!idInput.value) {
				console.warn("Please provide a user ID");
				return;
			}
			const userId = parseInt(idInput.value);
			try {
				const url = await this._avatarService.getUserAvatarUrl(userId);
				console.log(`Avatar URL: ${url}`);
				const terminal = CustomTerminal["_instance"];
				if (terminal && typeof terminal.logImage === "function") {
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
