import UsersApi, { User } from "../../../api/user.js";
import { buttonHTML } from "../../../components/button.js";
import { COMMON_CLASSES } from "../../../style/tailwindClasses.js";

export default class UpdateUserForm {
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
			<form id="update-user-form" class="${COMMON_CLASSES.form}">
				<div>
					<label class="${COMMON_CLASSES.label}">User ID (required)</label>
					<input type="number" id="updateform-user-id" class="${COMMON_CLASSES.input}">
				</div>

				<div>
					<label class="${COMMON_CLASSES.label}">New Name</label>
					<input type="text" id="updateform-user-name" class="${COMMON_CLASSES.input}">
				</div>

				<div>
					<label class="${COMMON_CLASSES.label}">New Email</label>
					<input type="email" id="updateform-user-email" class="${COMMON_CLASSES.input}">
				</div>

				${buttonHTML({
					type: "submit",
					label: "Update User"
				})}
			</form>
		`;

		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("update-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			const idInput = document.getElementById("updateform-user-id") as HTMLInputElement;
			const nameInput = document.getElementById("updateform-user-name") as HTMLInputElement;
			const emailInput = document.getElementById("updateform-user-email") as HTMLInputElement;

			if (!idInput.value) {
				console.warn("Please provide a user ID");
				return;
			}

			if (!nameInput.value && !emailInput.value) {
				console.warn("Please provide at least one field to update (name or email)");
				return;
			}

			const userId = parseInt(idInput.value);

			const updateData: User = {};

			if (nameInput.value) {
				updateData.username = nameInput.value;
			}
			if (emailInput.value) {
				updateData.email = emailInput.value;
			}

			try {
				const response = await this._userService.updateUser(userId, updateData);
				form.reset();
				console.log(`User updated:\n${JSON.stringify(response, null, 2)}`);
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
