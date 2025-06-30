import { gameMap } from '../map/gameMap.js';
import { Ball } from '../ball/ball.js';
import { playerPaddle } from '../player/player.js';
import { showSemiFinalSplashScreen, showFinalSplashScreen } from '../utils/splashScreenUtils.js';
import Router from '../../router/Router.js';

/**
 * Tournament Client Handler
 * Handles tournament-specific client-side logic
 */
export class TournamentClientHandler {

    /**
     * Handle tournament advancement message
     * @param message - Tournament advancement message from server
     * @param updateGameStatus - Function to update game status
     * @param gameState - Current game state object
     */
    static handleTournamentAdvancement(
        message: any, 
        updateGameStatus: (msg: string) => void,
        gameState: {
            isGameOver: boolean;
            isGameLoopRunning: boolean;
            map: gameMap | null;
            ball: Ball | null;
            player1: playerPaddle | null;
            player2: playerPaddle | null;
        }
    ): void {
        console.log('🏆 Tournament advancement received:', message);
        updateGameStatus(message.message || 'Tournament advancement...');
        
        // Ensure game elements are cleaned up during advancement
        if (message.status === 'transferred_to_final') {
            // Player has been moved to final room
            gameState.isGameOver = true; // Prevent input
            
            // Stop game loop if running
            if (gameState.isGameLoopRunning && gameState.map?.getEngine) {
                gameState.map.getEngine.stopRenderLoop();
                gameState.isGameLoopRunning = false;
            }
            
            // ⭐ TOURNAMENT MAP CLEANUP: Dispose of old map to prevent multiple maps being visible
            if (gameState.map) {
                gameState.map.dispose();
                gameState.map = null;
            }
            
            // Clear game objects
            gameState.ball = null;
            gameState.player1 = null;
            gameState.player2 = null;
        }
    }

    /**
     * Handle hide game elements message (for semi-final completion)
     * @param message - Hide elements message from server
     * @param updateGameStatus - Function to update game status
     * @param gameState - Current game state object
     */
    static handleHideGameElements(
        message: any,
        updateGameStatus: (msg: string) => void,
        gameState: {
            ball: Ball | null;
            player1: playerPaddle | null;
            player2: playerPaddle | null;
        }
    ): void {
        console.log('🏆 Hide game elements received:', message);
        updateGameStatus(message.message || 'Semi-final completed!');
        
        // Hide game elements while keeping map visible
        if (message.hideElements) {
            if (message.hideElements.ball && gameState.ball?.ballBody) {
                gameState.ball.ballBody.isVisible = false;
                console.log('🏆 Ball hidden');
            }
            if (message.hideElements.paddles) {
                if (gameState.player1?.paddleBody) {
                    gameState.player1.paddleBody.isVisible = false;
                }
                if (gameState.player2?.paddleBody) {
                    gameState.player2.paddleBody.isVisible = false;
                }
                console.log('🏆 Paddles hidden');
            }
            // Map stays visible (keepMap: true)
            console.log('🏆 Semi-final completed - showing clean map only');
        }
    }

    /**
     * Reset tournament game state for clean start
     * @param gameState - Game state object to reset
     */
    static resetTournamentGameState(gameState: {
        isGameOver: boolean;
        isGameLoopRunning: boolean;
    }): void {
        console.log('🏆 Resetting tournament game state for clean start...');
        gameState.isGameOver = false;
        gameState.isGameLoopRunning = false;
        console.log('🏆 Tournament game state reset completed');
    }

    /**
     * Ensure game elements are visible for new tournament game
     * @param gameState - Current game state object
     */
    static ensureTournamentElementsVisible(gameState: {
        ball: Ball | null;
        player1: playerPaddle | null;
        player2: playerPaddle | null;
    }): void {
        console.log('🏆 Ensuring tournament game elements are visible...');
        
        // ⭐ TOURNAMENT FIX: Ensure all game elements are visible and ready
        if (gameState.player1?.paddleBody) {
            gameState.player1.paddleBody.isVisible = true;
        }
        if (gameState.player2?.paddleBody) {
            gameState.player2.paddleBody.isVisible = true;
        }
        if (gameState.ball?.ballBody) {
            gameState.ball.ballBody.isVisible = true;
        }
        
        console.log('✅ All tournament game elements made visible for new game');
    }

    /**
     * Reset paddle positions for tournament games
     * @param player1 - Player 1 paddle
     * @param player2 - Player 2 paddle
     */
    static resetTournamentPaddlePositions(player1: playerPaddle, player2: playerPaddle): void {
        console.log('🏆 Resetting paddle positions for tournament game...');
        
        // ⭐ TOURNAMENT FIX: Reset paddle Z positions to 0 (center) for clean start
        player1.setZ(0);
        player2.setZ(0);
    }

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
        const isWinner = gameEndData.winner.id === localPlayerId;
        const score = `${gameEndData.winner.score}-${gameEndData.loser.score}`;
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
        
        const score = `${gameEndData.winner.score}-${gameEndData.loser.score}`;
        
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
     * Handle direct final placement from semi-finals
     * This happens when one semi-final becomes empty and the other completes normally
     */
    static async handleDirectFinalPlacement(
        gameEndData: any,
        localPlayerId: string | null,
        opponentName: string,
        finalPlacement: 1 | 2
    ): Promise<void> {
        console.log(`🏆 Handling direct final placement: ${finalPlacement}${getPlacementSuffix(finalPlacement)} place`);
        
        const score = `${gameEndData.winner.score}-${gameEndData.loser.score}`;
        
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

    /**
     * Get placement suffix for display (1st, 2nd, 3rd, 4th)
     * @param placement - The placement number
     * @returns The placement suffix string
     */
    static getPlacementSuffix(placement: number): string {
        switch (placement) {
            case 1: return 'st';
            case 2: return 'nd'; 
            case 3: return 'rd';
            default: return 'th';
        }
    }

    /**
     * Log tournament client event
     * @param event - Event type
     * @param details - Event details
     */
    static logTournamentEvent(event: string, details: any): void {
        console.log(`🏆 TOURNAMENT CLIENT: ${event}`, details);
    }
}

/**
 * Get placement suffix for display (1st, 2nd, 3rd, 4th) - standalone function
 * @param placement - The placement number
 * @returns The placement suffix string
 */
function getPlacementSuffix(placement: number): string {
    switch (placement) {
        case 1: return 'st';
        case 2: return 'nd'; 
        case 3: return 'rd';
        default: return 'th';
    }
}

export default TournamentClientHandler; 