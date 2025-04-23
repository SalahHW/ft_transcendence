import UsersApi from "../../api/user.js";

export default class GetUserForm {
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
		<form id="get-user-form" class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700">ID (optional)</label>
				<input type="number" id="getform-user-id" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700">Name (optional)</label>
				<input type="text" id="getform-user-name" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
			</div>

			<button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
				Get User
			</button>
		</form>
		`;

		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("get-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			const idInput = document.getElementById("getform-user-id") as HTMLInputElement;
			const nameInput = document.getElementById("getform-user-name") as HTMLInputElement;

			if (!idInput.value && !nameInput.value) {
				console.log("Please provide at least one field to get user (id or name)");
				return;
			}

			try {
				if (idInput.value) {
					const userId = parseInt(idInput.value);
					const response = await this._userService.getUser(userId);
					console.log(`User found by id: ${response}`);
				}
				else if (nameInput.value) {
					const response = await this._userService.getUsersByUsername(nameInput.value);
					console.log(`User found by name: ${response}`);
				}

				form.reset();
			}
			catch (error) {
				if (error instanceof Error) {
					console.log(`Failed to get user by id or name: ${error.message}`);
				}
				else {
					console.log(`Failed to get user by id or name: ${error}`);
				}
			}
		});
	}
}
