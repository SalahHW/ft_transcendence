import Router from "../router/router.js";

export default class HomePage {
	private _container: HTMLElement;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		if (!this._container)
			throw new Error(`Container ${containerId} not found`);
	}

	render(): void {
		this._container.innerHTML = /* HTML */ `
		<div class="container mx-auto p-4 h-[90vh] flex flex-col">
			<div class="flex-grow flex items-center justify-center">
				<button id="play-button" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md text-xl font-bold shadow-md transition duration-300">Play</button>
			</div>
			<div class="absolute bottom-8 left-8">
				<button id="api-test-page-button" class="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow-md transition duration-300 flex items-center gap-2">
					<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="text-white"><path fill="none" stroke="currentColor" stroke-width="2" d="M9 1v7L2 20v3h20v-3L15 8V1m0 17a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm-6 2a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm9-7c-7-3-6 4-12 1M6 1h12"/></svg>
					API Test Page
				</button>
			</div>
		</div>
		`;
		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const apiTestPageButton = document.getElementById("api-test-page-button") as HTMLButtonElement;
		apiTestPageButton.addEventListener("click", () => {
			const router = Router.getInstance("app-container");
			router.navigate("/api-test");
		});
	}
}
