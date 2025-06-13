
import GamePage from "../../views/gamePage.js";
import { registerCurrentUserForGame } from "../utils/fetch.js";

/**
 * Handles the logic for starting a tournament match
 * @param cache - The route cache object to store the GamePage instance
 */
export async function handleTournament(cache: any): Promise<void> {
	try {
		const playerData = await registerCurrentUserForGame(true);
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
		console.error("Error registering user for tournament:", error);
	}
} 