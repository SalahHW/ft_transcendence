import UsersApi, { User } from "../../api/user.js";

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
		<form id="create-user-form" class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700">Name (required)</label>
				<input type="text" id="createform-user-name" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700">Email (required)</label>
				<input type="email" id="createform-user-email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
			</div>

			<button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
				Create User
			</button>
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

			if (!nameInput.value || !emailInput.value) {
				console.log("Please provide both name and email");
				return;
			}

			const userData: User = {
				username: nameInput.value,
				email: emailInput.value,
			};

			try {
				const response = await this._userService.createUser(userData);
				console.log(`User created: ${response}`);
			}
			catch (error) {
				if (error instanceof Error) {
					console.log(`Failed to create user ${userData}:`, error.message);
				}
				else {
					console.log(`Failed to create user ${userData}:`, error);
				}
			}
		});
	}
}
