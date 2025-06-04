import UsersApi from "../../../api/user.js";
import { buttonHTML } from "../../../components/button.js";
import { COMMON_CLASSES } from "../../../style/tailwindClasses.js";

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
			<form id="delete-user-form" class="${COMMON_CLASSES.form}">
				<div>
					<label class="${COMMON_CLASSES.label}">ID</label>
					<input type="number" id="deleteform-user-id" class="${COMMON_CLASSES.input}">
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
