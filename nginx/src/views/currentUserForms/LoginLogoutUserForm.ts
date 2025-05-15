import UsersApi from "../../api/user.js";

export default class LoginLogoutUserForm {
	private _container: HTMLElement;
	private _userService: UsersApi;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		this._userService = new UsersApi();
	}

	async render(): Promise<void> {
		try {
			const response = await this._userService.getCurrentUser();
			if (response)
				this._renderLogoutForm();
			else
				this._renderLoginForm();
		}
		catch (error) {
			if (error instanceof Error)
				console.log(error.message);
			else
				console.log(error);
		}
	}

	private _renderLoginForm(): void {
		this._container.innerHTML = /* HTML */ `
			<form id="login-logout-user-form" class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700">Username</label>
					<input type="text" id="login-logout-user-form-username" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700">Password</label>
					<input type="password" id="login-logout-user-form-password" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
				</div>

				<button id="login-logout-user-form-login" type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
					Login
				</button>
			</form>
		`;

		this._attachLoginEventListeners();
	}

	private _attachLoginEventListeners(): void {
		const form = document.getElementById("login-logout-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			const usernameInput = document.getElementById("login-logout-user-form-username") as HTMLInputElement;
			const passwordInput = document.getElementById("login-logout-user-form-password") as HTMLInputElement;
			if (!usernameInput.value || !passwordInput.value) {
				console.log("Please provide both username and password");
				return;
			}

			try {
				const response = await this._userService.login(usernameInput.value, passwordInput.value);
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

	private _renderLogoutForm(): void {
		this._container.innerHTML = /* HTML */ `
			<form id="login-logout-user-form" class="space-y-4">
				<button id="login-logout-user-form-logout" type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
					Logout
				</button>
			</form>
		`;

		this._attachLogoutEventListeners();
	}

	private _attachLogoutEventListeners(): void {
		const form = document.getElementById("login-logout-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			await this._userService.logout();
		});
	}

}
