import { showSemiFinalSplashScreen, showFinalSplashScreen } from '../../utils/splashScreenUtils.js';
import Router from '../../../router/Router.js';
import { TournamentUtils } from '../utils/TournamentUtils.js';

/**
 * Handles tournament placement and game end scenarios
 */
export class TournamentPlacementHandler {
    /**
     * Handle semi-final game end and show appropriate splash screen
     * @param gameEndData - Game result data
     * @param localPlayerId - Current player's ID
     * @param opponentName - Opponent's name
     * @returns Promise that resolves when splash screen is complete
     */
    static async handleSemiFinalGameEnd(
        gameEndData: any,
        localPlayerId: string | null,
        opponentName: string
    ): Promise<void> {
        const isWinner = TournamentUtils.isWinner(gameEndData, localPlayerId);
        const score = TournamentUtils.getScoreString(gameEndData);
        try {
            await showSemiFinalSplashScreen(isWinner, opponentName, score, 5000);
        } catch (error) {
            console.error('🏆 ERROR: Error showing semi-final splash screen:', error);
        }
    }

    /**
     * Handle final game end and show appropriate placement splash screen
     * @param gameEndData - Game result data
     * @param localPlayerId - Current player's ID
     * @param opponentName - Opponent's name
     * @param finalPlacement - Player's final tournament placement (1, 2, 3, or 4)
     * @returns Promise that resolves when splash screen is complete
     */
    static async handleFinalGameEnd(
        gameEndData: any,
        localPlayerId: string | null,
        opponentName: string,
        finalPlacement: 1 | 2 | 3 | 4
    ): Promise<void> {
        const score = TournamentUtils.getScoreString(gameEndData);
        
        try {
            await showFinalSplashScreen(finalPlacement, opponentName, score, 5000);
            
            // ⭐ CLEANUP BEFORE NAVIGATION: Ensure clean state before leaving game
            if ((window as any).leaveGame && typeof (window as any).leaveGame === 'function') {
                try {
                    (window as any).leaveGame();
                } catch (cleanupError) {
                    console.error('🏆 ⚠️ Error during game cleanup:', cleanupError);
                    // Continue with navigation even if cleanup fails
                }
            }
            const router = Router.getInstance();
            const navigationSuccess = router.navigate('/', true); // Use replaceState to replace tournament history
            
            if (navigationSuccess) {
                console.log('🏆 ✅ Successfully navigated to main page after tournament completion');
            } else {
                console.error('🏆 ❌ Failed to navigate to main page - attempting fallback');
                // Fallback: Force reload to home page
                window.location.href = '/';
            }
        } catch (error) {
            console.error('🏆 ERROR: Error showing final splash screen:', error);
            
            if ((window as any).leaveGame && typeof (window as any).leaveGame === 'function') {
                try {
                    (window as any).leaveGame();
                } catch (cleanupError) {
                    console.error('🏆 ⚠️ Error during error cleanup:', cleanupError);
                }
            }
            
            try {
                const router = Router.getInstance();
                router.navigate('/', true);
            } catch (navError) {
                console.error('🏆 ERROR: Navigation also failed:', navError);
                // Ultimate fallback
                window.location.href = '/';
            }
        }
    }

    /**
     * Handle automatic tournament victory when player is alone in tournament
     * This happens when all other players disconnect, leaving only one player
     */
    static async handleAutomaticTournamentVictory(
        gameEndData: any,
        localPlayerId: string | null
    ): Promise<void> {
        console.log('🏆 🏆 Handling automatic tournament victory!');
        
        try {
            // Show 1st place splash screen for automatic victory
            await showFinalSplashScreen(1, 'All Opponents Disconnected', '11-0', 5000);
            
            // ⭐ CLEANUP BEFORE NAVIGATION: Ensure clean state before leaving game
            if ((window as any).leaveGame && typeof (window as any).leaveGame === 'function') {
                try {
                    (window as any).leaveGame();
                } catch (cleanupError) {
                    console.error('🏆 ⚠️ Error during game cleanup:', cleanupError);
                }
            }
            
            // Clean up WebSocket connection
            if ((window as any).clientConnection?.socket) {
                (window as any).clientConnection.socket.close();
            }
            
            // Navigate back to home
            const router = Router.getInstance();
            const navigationSuccess = router.navigate('/', true);
            
            if (navigationSuccess) {
                console.log('🏆 ✅ Successfully navigated to main page after automatic tournament victory');
            } else {
                console.error('🏆 ❌ Failed to navigate to main page - attempting fallback');
                window.location.href = '/';
            }
        } catch (error) {
            console.error('🏆 Error handling automatic tournament victory:', error);
            // Ensure navigation even on error
            window.location.href = '/';
        }
    }

    /**
     * Handle direct final placement from semi-finals
     * This happens when one semi-final becomes empty and the other completes normally
     */
    static async handleDirectFinalPlacement(
        gameEndData: any,
        localPlayerId: string | null,
        opponentName: string,
        finalPlacement: 1 | 2
    ): Promise<void> {
        console.log(`🏆 Handling direct final placement: ${finalPlacement}${TournamentUtils.getPlacementSuffix(finalPlacement)} place`);
        
        const score = TournamentUtils.getScoreString(gameEndData);
        
        try {
            // Show final placement splash screen
            await showFinalSplashScreen(finalPlacement, opponentName, score, 5000);
            
            // ⭐ CLEANUP BEFORE NAVIGATION: Ensure clean state before leaving game
            if ((window as any).leaveGame && typeof (window as any).leaveGame === 'function') {
                try {
                    (window as any).leaveGame();
                } catch (cleanupError) {
                    console.error('🏆 ⚠️ Error during game cleanup:', cleanupError);
                }
            }
            
            // Clean up WebSocket connection
            if ((window as any).clientConnection?.socket) {
                (window as any).clientConnection.socket.close();
            }
            
            // Navigate back to home
            const router = Router.getInstance();
            const navigationSuccess = router.navigate('/', true);
            
            if (navigationSuccess) {
                console.log('🏆 ✅ Successfully navigated to main page after direct final placement');
            } else {
                console.error('🏆 ❌ Failed to navigate to main page - attempting fallback');
                window.location.href = '/';
            }
        } catch (error) {
            console.error('🏆 Error handling direct final placement:', error);
            // Ensure navigation even on error
            window.location.href = '/';
        }
    }
} 