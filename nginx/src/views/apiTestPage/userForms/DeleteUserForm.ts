import UsersApi from "../../../api/user.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

export default class DeleteUserForm {
	private _container: HTMLElement;
	private _userService: UsersApi;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		this._userService = new UsersApi();
		if (!this._container)
			throw new Error(`Container ${containerId} not found`);
	}

	render(): void {
		this._container.innerHTML = /* HTML */ `
			<form id="delete-user-form" class="${UI_THEME.components.form}">
				<div>
					<input type="number" id="deleteform-user-id" placeholder="User ID" class="${UI_THEME.components.input}">
				</div>

				${buttonHTML({
					type: "submit",
					label: "Delete User"
				})}
			</form>
		`;

		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("delete-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			const idInput = document.getElementById("deleteform-user-id") as HTMLInputElement;

			if (!idInput.value) {
				console.warn("Please provide an id");
				return;
			}

			try {
				const userId = parseInt(idInput.value);
				await this._userService.deleteUser(userId);
				form.reset();
				console.log(`User ${userId} deleted`);
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
