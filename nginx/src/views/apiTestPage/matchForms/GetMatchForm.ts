/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GetMatchForm.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/05/26 20:42:45 by edelarbr          #+#    #+#             */
/*   Updated: 2025/07/03 13:16:22 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import MatchServiceAPI from "../../../api/match.js";
import { buttonHTML } from "../../../components/button.js";
import { UI_THEME } from "../../../style/tailwindClasses.js";

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
			<form id="get-match-form" class="${UI_THEME.components.form}">
				<div>
					<input type="number" id="getform-match-id" placeholder="Match ID" class="${UI_THEME.components.input}">
				</div>
				${buttonHTML({
					type: "submit",
					label: "Get Match"
				})}
			</form>
		`;

		this._attachEventListeners();
	}

	private _attachEventListeners(): void {
		const form = document.getElementById("get-match-form") as HTMLFormElement;

		form.addEventListener("submit", async (event) => {
			event.preventDefault();

			const idInput = document.getElementById("getform-match-id") as HTMLInputElement;

			if (!idInput.value) {
				console.warn("Please provide a match ID");
				return;
			}

			try {
				const matchId = parseInt(idInput.value);
				const match = await this._matchService.getMatchById(matchId);
				console.log(`Match found by id:`, match);
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
