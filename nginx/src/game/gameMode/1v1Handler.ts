/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   1v1Handler.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 00:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/01/27 00:00:00 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import GamePage from "../../views/gamePages/gamePage.js";
import { getUserResponseData, registerCurrentUserForGame } from "../utils/fetch.js";

/**
 * Handles the logic for starting a 1v1 simple match
 * @param cache - The route cache object to store the GamePage instance
 */
export async function handleSimpleMatch(cache: any): Promise<void> {
	try {
		const playerData = await registerCurrentUserForGame();
		
		if (!cache.cache) {
			cache.cache = new GamePage("app-container");
		}
		cache.cache.render();
		
		// Load the pre-bundled game client
		const gameBundlePath = "/js/game.bundle.js";
		const gameClientModule = await import(gameBundlePath);
		
		if (gameClientModule.setupJoinGameButton) {
			gameClientModule.setupJoinGameButton();
		}
		await gameClientModule.initializeGame(playerData.id);
		
	} catch (error) {
		console.error("Error registering user for game:", error);
	}
}