import UsersApi from "../../../api/user.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

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
			<form id="create-user-form" class="${UI_THEME.components.form}">
				<div>
					<input type="text" id="createform-user-name" placeholder="Name (required)" class="${UI_THEME.components.input}">
				</div>

				<div>
					<input type="email" id="createform-user-email" placeholder="Email (required)" class="${UI_THEME.components.input}">
				</div>

				<div>
					<input type="password" id="createform-user-password" placeholder="Password (required)" class="${UI_THEME.components.input}">
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

			const userData = {
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
