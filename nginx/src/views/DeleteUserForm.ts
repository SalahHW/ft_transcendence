import UserServiceAPI from "../api/userService.js";

export default class DeleteUserForm {
	private _container: HTMLElement;
	private _userService: UserServiceAPI;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		this._userService = new UserServiceAPI();
		if (!this._container)
			throw new Error(`Container ${containerId} not found`);
	}

	render(): void {
		this._container.innerHTML = /* HTML */ `
		<form id="delete-user-form" class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700">ID</label>
				<input type="number" id="deleteform-user-id" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
			</div>

			<button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
				Delete User
			</button>
		</form>
		`;

		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("delete-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			const idInput = document.getElementById("deleteform-user-id") as HTMLInputElement;

			try {
				if (idInput.value) {
					const userId = parseInt(idInput.value);
					const response = await this._userService.deleteUser(userId);
					console.log(`User deleted: ${response}`);
				}

				form.reset();
			}
			catch (error) {
				if (error instanceof Error) {
					console.log(`Failed to delete user:`, error.message);
				} else {
					console.log(`Failed to delete user:`, error);
				}
			}
		});
	}
}
