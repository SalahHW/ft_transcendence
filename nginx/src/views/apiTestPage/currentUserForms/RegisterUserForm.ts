import UsersApi from "../../../api/user.js";

export default class RegisterUserForm {
	private _container: HTMLElement;
	private _userService: UsersApi;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		this._userService = new UsersApi();
	}

	async render(): Promise<void> {
		this._container.innerHTML = /* HTML */ `
			<form id="register-user-form" class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700">Username (required)</label>
					<input type="text" id="register-user-form-username" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700">Email (required)</label>
					<input type="email" id="register-user-form-email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700">Password (required)</label>
					<input type="password" id="register-user-form-password" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
				</div>

				<button id="register-user-form-register" type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
					Register
				</button>
			</form>
		`;

		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("register-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			const usernameInput = document.getElementById("register-user-form-username") as HTMLInputElement;
			const passwordInput = document.getElementById("register-user-form-password") as HTMLInputElement;
			const emailInput = document.getElementById("register-user-form-email") as HTMLInputElement;

			if (!usernameInput.value || !passwordInput.value || !emailInput.value) {
				console.log("Please provide username, email and password");
				return;
			}

			try {
				const response = await this._userService.register(usernameInput.value, emailInput.value, passwordInput.value);
				console.log(response);
			}
			catch (error) {
				if (error instanceof Error)
					console.log(error.message);
				else
					console.log(error);
			}
		});
	}
}
