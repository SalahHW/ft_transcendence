export default class ApiTestPage {
	private _container: HTMLElement;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		if (!this._container)
			throw new Error(`Container ${containerId} not found`);
	}

	render(): void {
		this._container.innerHTML = /* HTML */ `
		<div class="container mx-auto p-4 h-[90vh] flex flex-col">
			<h1 class="text-3xl font-bold mb-4 text-center text-gradient bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent drop-shadow">API Test Page</h1>
			<div class="flex flex-col md:flex-row gap-6 flex-1">
				<!-- First card -->
				<div class="flex-1 bg-white rounded-lg shadow-md p-6 border border-gray-200 min-h-[50vh]">
					<div class="w-full h-full flex flex-col">
						<div class="flex-grow">
							<div id="left-card-content" class="h-full"></div>
						</div>
					</div>
				</div>
				<!-- Second card -->
				<div class="flex-1 bg-white rounded-lg shadow-md p-6 border border-gray-200 min-h-[50vh]">
					<div class="w-full h-full flex flex-col">
						<div class="flex-grow">
							<div id="right-card-content" class="h-full"></div>
						</div>
					</div>
				</div>
			</div>
		</div>
		`;
		this._renderLeftCardContent();
		this._renderRightCardContent();
	}

	private _renderLeftCardContent(): void {
		import('../components/tabs.js').then((module) => {
			const tabs = new module.default(
				"left-card-content", ["Get User", "Create User", "Update User", "Delete User"]
			);

			/* Get User */
			const getUserContainer = document.createElement('div');
			getUserContainer.id = "get-user-form-container";
			tabs.setTabContent(0, getUserContainer);

			import('./GetUserForm.js').then((module) => {
				const getUserForm = new module.default("get-user-form-container");
				getUserForm.render();
			});

			/* Create User */
			const createUserContainer = document.createElement('div');
			createUserContainer.id = "create-user-form-container";
			tabs.setTabContent(1, createUserContainer);

			import('./CreateUserForm.js').then((module) => {
				const userForm = new module.default("create-user-form-container");
				userForm.render();
			});

			/* Update User */
			const updateUserContainer = document.createElement('div');
			updateUserContainer.id = "update-user-form-container";
			tabs.setTabContent(2, updateUserContainer);

			import('./UpdateUserForm.js').then((module) => {
				const updateUserForm = new module.default("update-user-form-container");
				updateUserForm.render();
			});

			/* Delete User */
			const deleteUserContainer = document.createElement('div');
			deleteUserContainer.id = "delete-user-form-container";
			tabs.setTabContent(3, deleteUserContainer);

			import('./DeleteUserForm.js').then((module) => {
				const deleteUserForm = new module.default("delete-user-form-container");
				deleteUserForm.render();
			});
		});
	}

	private _renderRightCardContent(): void {
		import('../components/customTerminal.js').then((module) => {
			new module.default("right-card-content");
		});
	}
}
