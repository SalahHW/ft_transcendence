import MatchServiceAPI from "../../api/matche.js";

export default class GetMatchForm {
	private _container: HTMLElement;
	private _matchService: MatchServiceAPI;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		this._matchService = new MatchServiceAPI();
		if (!this._container)
			throw new Error(`Container ${containerId} not found`);
	}

	render(): void {
		this._container.innerHTML = /* HTML */ `
		<form id="get-match-form" class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700">ID</label>
				<input type="number" id="getform-match-id" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
			</div>

			<button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
				Get Match
			</button>
		</form>
		`;

		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("get-match-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			const idInput = document.getElementById("getform-match-id") as HTMLInputElement;

			if (!idInput.value) {
				console.log("Please provide an ID to get a match");
				return;
			}

			try {
				const matchId = parseInt(idInput.value);
				const response = await this._matchService.getMatchById(matchId);
				console.log(`Match found by id: ${response}`);
			}
			catch (error) {
				if (error instanceof Error) {
					console.error(`Error fetching match: ${error.message}`);
				}
				else {
					console.error(`Error fetching match: ${error}`);
				}
			}
		});
	}
}
