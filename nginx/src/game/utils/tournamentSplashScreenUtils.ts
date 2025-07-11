/**
 * Tournament Splash Screen Utilities
 * Handles showing appropriate tournament end screens based on player placement
 */

import FirstPlacePage from "../../views/gamePages/tournament/FirstPlacePage.js";
import SecondPlacePage from "../../views/gamePages/tournament/SecondPlacePage.js";
import ThirdPlacePage from "../../views/gamePages/tournament/ThirdPlacePage.js";
import FourthPlacePage from "../../views/gamePages/tournament/FourthPlacePage.js";

let currentSplashScreen: any = null;

/**
 * Show tournament end splash screen based on player placement
 */
export async function showTournamentEndSplashScreen(
    playerPlacement: number,
    containerId: string = 'app-container'
): Promise<void> {
    // Clean up any existing splash screen
    if (currentSplashScreen) {
        currentSplashScreen.cleanup();
        currentSplashScreen = null;
    }

    // Create and show the appropriate splash screen
    switch (playerPlacement) {
        case 1:
            currentSplashScreen = new FirstPlacePage(containerId);
            break;
        case 2:
            currentSplashScreen = new SecondPlacePage(containerId);
            break;
        case 3:
            currentSplashScreen = new ThirdPlacePage(containerId);
            break;
        case 4:
            currentSplashScreen = new FourthPlacePage(containerId);
            break;
        default:
            console.error(`Invalid tournament placement: ${playerPlacement}`);
            return;
    }

    // Render the splash screen
    currentSplashScreen.render();
}

/**
 * Clean up the current tournament splash screen
 */
export function cleanupTournamentSplashScreen(): void {
    if (currentSplashScreen) {
        currentSplashScreen.cleanup();
        currentSplashScreen = null;
    }
} 