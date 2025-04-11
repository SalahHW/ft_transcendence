export default class ApiTestPage {
	private _container: HTMLElement;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		if (!this._container)
			throw new Error(`Container ${containerId} note found`);
	}

	render(): void {
		this._container.innerHTML = /* HTML */ `
		<div class="flex flex-col md:flex-row gap-4 p-4">
			<!-- Carte gauche: API Interaction -->
			<div class="w-full md:w-1/2 bg-white rounded-lg shadow-md p-4">
			<h2 class="text-xl font-bold mb-4">API Interaction</h2>

			<!-- Section formulaire de création -->
			<div class="mb-6">
				<h3 class="text-lg font-semibold mb-2">Create User</h3>
				<div id="user-form"></div>
			</div>

			<!-- Section affichage utilisateur -->
			<div>
				<h3 class="text-lg font-semibold mb-2">User Details</h3>
				<div id="user-display"></div>
			</div>
			</div>

			<!-- Carte droite: Console -->
			<div class="w-full md:w-1/2 bg-gray-900 text-white rounded-lg shadow-md p-4">
			<h2 class="text-xl font-bold mb-4">Console Output</h2>
			<div id="console-logger" class="font-mono text-sm h-[500px] overflow-y-auto"></div>
			</div>
		</div>
		`;
		this._initComponents();
	}

	private _initComponents(): void {
		import("./UserForm").then(module => {
			const UserForm = module.default;
			const userForm = new UserForm("user-display");
			userForm.render();
		});
	}
}
