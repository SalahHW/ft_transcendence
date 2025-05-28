import UsersApi, { User } from "../../../api/user.js";
import { buttonHTML } from "../../../components/button.js";
import { COMMON_CLASSES } from "../../../style/tailwindClasses.js";

export default class CreateUserForm {
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
			<form id="create-user-form" class="${COMMON_CLASSES.form}">
				<div>
					<label class="${COMMON_CLASSES.label}">Name (required)</label>
					<input type="text" id="createform-user-name" class="${COMMON_CLASSES.input}">
				</div>

				<div>
					<label class="${COMMON_CLASSES.label}">Email (required)</label>
					<input type="email" id="createform-user-email" class="${COMMON_CLASSES.input}">
				</div>

				<div>
					<label class="${COMMON_CLASSES.label}">Password (required)</label>
					<input type="password" id="createform-user-password" class="${COMMON_CLASSES.input}">
				</div>

				${buttonHTML({
					type: "submit",
					label: "Create User"
				})}
			</form>
		`;

		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("create-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			const nameInput = document.getElementById("createform-user-name") as HTMLInputElement;
			const emailInput = document.getElementById("createform-user-email") as HTMLInputElement;
			const passwordInput = document.getElementById("createform-user-password") as HTMLInputElement;
			if (!nameInput.value || !emailInput.value || !passwordInput.value) {
				console.warn("Please provide both name, email and password");
				return;
			}

			const userData: User = {
				username: nameInput.value,
				email: emailInput.value,
				password: passwordInput.value,
			};

			try {
				const response = await this._userService.createUser(userData);
				form.reset();
				console.log(`User created:\n${JSON.stringify(response, null, 2)}`);
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
