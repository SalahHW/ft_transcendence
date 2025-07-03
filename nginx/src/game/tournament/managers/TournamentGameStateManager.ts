import { gameMap } from '../../map/gameMap.js';
import { Ball } from '../../ball/ball.js';
import { playerPaddle } from '../../player/player.js';

/**
 * Manages tournament game state and element visibility
 */
export class TournamentGameStateManager {
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
     * Clean up game state during tournament advancement
     * @param gameState - Current game state object
     */
    static cleanupGameStateForAdvancement(gameState: {
        isGameOver: boolean;
        isGameLoopRunning: boolean;
        map: gameMap | null;
        ball: Ball | null;
        player1: playerPaddle | null;
        player2: playerPaddle | null;
    }): void {
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

    /**
     * Hide game elements for semi-final completion
     * @param message - Hide elements message from server
     * @param gameState - Current game state object
     */
    static hideGameElementsForSemiFinal(
        message: any,
        gameState: {
            ball: Ball | null;
            player1: playerPaddle | null;
            player2: playerPaddle | null;
        }
    ): void {
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
} 