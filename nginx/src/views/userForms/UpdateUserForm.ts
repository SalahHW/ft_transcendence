import UsersApi, { User } from "../../api/user.js";

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
			<form id="update-user-form" class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700">User ID (required)</label>
					<input type="number" id="updateform-user-id" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700">New Name</label>
					<input type="text" id="updateform-user-name" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700">New Email</label>
					<input type="email" id="updateform-user-email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
				</div>

				<button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
					Update User
				</button>
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
				console.log("Please provide a user ID");
				return;
			}

			if (!nameInput.value && !emailInput.value) {
				console.log("Please provide at least one field to update (name or email)");
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
				console.log(`User updated: ${response}`);

				form.reset();
			}
			catch (error) {
				if (error instanceof Error) {
					console.log(`Failed to update user:`, error.message);
				}
				else {
					console.log(`Failed to update user:`, error);
				}
			}
		});
	}
}
