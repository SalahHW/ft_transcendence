import UserServiceAPI from "../api/userService";

export default class UserForm {
	private _container: HTMLElement;
	private _userService: UserServiceAPI;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		this._userService = new UserServiceAPI();
		if (!this._container)
			throw new Error(`Container ${containerId} note found`);
	}

	render(): void {
		this._container.innerHTML = /* HTML */ `
			<form id="create-user-form" class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700">Name</label>
					<input type="text" id="user-name" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700">Email</label>
					<input type="email" id="user-email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required>
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

			const nameInput = document.getElementById("user-name") as HTMLInputElement;
			const emailInput = document.getElementById("user-email") as HTMLInputElement;

			const userData = {
				name: nameInput.value,
				email: emailInput.value
			};

			try {
				/*
				- insert create user API from user-service
				- console.log the result
				- throw if error
				*/

			}
			catch (error) {
				console.log(`Failed to create user ${userData}:`, error);
			}
		})
	}

}
