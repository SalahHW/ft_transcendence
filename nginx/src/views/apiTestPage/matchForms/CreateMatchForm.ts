/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CreateMatchForm.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:42 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/01 17:49:49 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import MatchServiceAPI, { Match } from "../../../api/match.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

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
			<form id="create-match-form" class="${UI_THEME.components.form}">
				<div>
					<input type="number" id="createform-user-id1" placeholder="User 1 ID" class="${UI_THEME.components.input}">
				</div>

				<div>
					<input type="number" id="createform-user-id2" placeholder="User 2 ID" class="${UI_THEME.components.input}">
				</div>

				<div>
					<input type="number" id="createform-user-score1" placeholder="User 1 score" class="${UI_THEME.components.input}">
				</div>

				<div>
					<input type="number" id="createform-user-score2" placeholder="User 2 score" class="${UI_THEME.components.input}">
				</div>

				${buttonHTML({
					type: "submit",
					label: "Create Match"
				})}
			</form>
		`;

		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("create-match-form") as HTMLFormElement;

		form.addEventListener("submit", async (element) => {
			element.preventDefault();

			const id1Input = document.getElementById("createform-user-id1") as HTMLInputElement;
			const id2Input = document.getElementById("createform-user-id2") as HTMLInputElement;
			const score1Input = document.getElementById("createform-user-score1") as HTMLInputElement;
			const score2Input = document.getElementById("createform-user-score2") as HTMLInputElement;

			if (!id1Input.value || !id2Input.value || !score1Input.value || !score2Input.value) {
				console.warn("Please provide both id1, id2, score1 and score2");
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
					console.error(`Failed to create match ${matchData}:`, error.message);
				}
				else {
					console.error(`Failed to create match ${matchData}:`, error);
				}
			}
		});
	}
}
