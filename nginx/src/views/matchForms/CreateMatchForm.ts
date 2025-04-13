import MatchServiceAPI, { Match } from "../../api/matche.js";

export default class CreateMatchForm {
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
		<form id="create-match-form" class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700">User 1 ID</label>
				<input type="number" id="createform-user-id1" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700">User 2 ID</label>
				<input type="number" id="createform-user-id2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700">User 1 score</label>
				<input type="number" id="createform-user-score1" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700">User 2 score</label>
				<input type="number" id="createform-user-score2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
			</div>

			<button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
				Create Match
			</button>
		</form>
		`;

		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("create-user-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			const id1Input = document.getElementById("createform-user-id1") as HTMLInputElement;
			const id2Input = document.getElementById("createform-user-id2") as HTMLInputElement;
			const score1Input = document.getElementById("createform-user-score1") as HTMLInputElement;
			const score2Input = document.getElementById("createform-user-score2") as HTMLInputElement;

			if (!id1Input.value || !id2Input.value || !score1Input.value || !score2Input.value) {
				console.log("Please provide both id1, id2, score1 and score2");
				return;
			}

			const matchData: Match = {
				userId1: parseInt(id1Input.value),
				userId2: parseInt(id2Input.value),
				userScore1: parseInt(score1Input.value),
				userScore2: parseInt(score2Input.value),
			};

			try {
				const response = await this._matchService.createMatch(matchData);
				console.log(`Match created: ${response}`);
			}
			catch (error) {
				if (error instanceof Error) {
					console.log(`Failed to create match ${matchData}:`, error.message);
				}
				else {
					console.log(`Failed to create match ${matchData}:`, error);
				}
			}
		});
	}
}
