import UsersApi from "../../../services/api/user.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class GetMeUserForm {
	private _container: HTMLElement;
	private _usersApi: UsersApi;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		this._usersApi = new UsersApi();
		if (!this._container)
			throw new Error(`Container ${containerId} not found`);
	}

	render(): void {
		this._container.innerHTML = /* HTML */ `
			<form id="get-me-user-form" class="${UI_THEME.components.form}">
				${buttonHTML({
					type: "submit",
					label: "Get Me"
				})}
			</form>
		`;
		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("get-me-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			try {
				const response = await this._usersApi.getCurrentUser();
				console.log(`Current user:\n${JSON.stringify(response, null, 2)}`);
			}
			catch (error) {
				if (error instanceof Error)
					console.error(error.message);
				else
					console.error(error);
			}
		});
	}
}
