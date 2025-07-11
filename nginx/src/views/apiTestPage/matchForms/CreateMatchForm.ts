/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CreateMatchForm.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:42 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/11 15:13:31 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import MatchServiceAPI from "../../../services/api/match.js";
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
					<input type="text" id="createform-player1" placeholder="Player 1 name" class="${UI_THEME.components.input}">
				</div>
				<div>
					<input type="text" id="createform-player2" placeholder="Player 2 name" class="${UI_THEME.components.input}">
				</div>
				<div>
					<input type="number" id="createform-match-id" placeholder="Match ID" class="${UI_THEME.components.input}">
				</div>
				<div>
					<input type="number" id="createform-player1-score" placeholder="Player 1 score" class="${UI_THEME.components.input}">
				</div>
				<div>
					<input type="number" id="createform-player2-score" placeholder="Player 2 score" class="${UI_THEME.components.input}">
				</div>
				<div>
					<input type="text" id="createform-winner" placeholder="Winner address (0x...)" class="${UI_THEME.components.input}">
				</div>
				${buttonHTML({
					type: "submit",
					label: "Report Match"
				})}
			</form>
		`;
		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("create-match-form") as HTMLFormElement;

		form.addEventListener("submit", async (event) => {
			event.preventDefault();

			const player1Input = document.getElementById("createform-player1") as HTMLInputElement;
			const player2Input = document.getElementById("createform-player2") as HTMLInputElement;
			const matchIdInput = document.getElementById("createform-match-id") as HTMLInputElement;
			const player1ScoreInput = document.getElementById("createform-player1-score") as HTMLInputElement;
			const player2ScoreInput = document.getElementById("createform-player2-score") as HTMLInputElement;
			const winnerInput = document.getElementById("createform-winner") as HTMLInputElement;

			if (!player1Input.value || !player2Input.value || !matchIdInput.value || !player1ScoreInput.value || !player2ScoreInput.value || !winnerInput.value) {
				console.warn("Please provide all fields: player1, player2, matchId, player1Score, player2Score, winner");
				return;
			}

			const matchData = {
				player1: player1Input.value,
				player2: player2Input.value,
				matchId: parseInt(matchIdInput.value),
				player1Score: parseInt(player1ScoreInput.value),
				player2Score: parseInt(player2ScoreInput.value),
				winner: winnerInput.value
			};

			try {
				const txHash = await this._matchService.reportMatch(matchData);
				console.log(`Match reported! Tx hash: ${txHash}`);
				form.reset();
			}
			catch (error) {
				if (error instanceof Error) {
					console.error(`Failed to report match:`, error.message);
				}
				else {
					console.error(`Failed to report match:`, error);
				}
			}
		});
	}
}
