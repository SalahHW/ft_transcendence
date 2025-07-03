import { gameMap } from '../../map/gameMap.js';
import { Ball } from '../../ball/ball.js';
import { playerPaddle } from '../../player/player.js';
import { TournamentGameStateManager } from '../managers/TournamentGameStateManager.js';

/**
 * Handles tournament advancement and element hiding logic
 */
export class TournamentAdvancementHandler {
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
            TournamentGameStateManager.cleanupGameStateForAdvancement(gameState);
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
        
        TournamentGameStateManager.hideGameElementsForSemiFinal(message, gameState);
    }
} 