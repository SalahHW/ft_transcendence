import { gameMap } from '../map/gameMap.js';
import { Ball } from '../ball/ball.js';
import { playerPaddle } from '../player/player.js';
import { TournamentAdvancementHandler } from './handlers/TournamentAdvancementHandler.js';
import { TournamentPlacementHandler } from './handlers/TournamentPlacementHandler.js';
import { TournamentGameStateManager } from './managers/TournamentGameStateManager.js';
import { TournamentUtils } from './utils/TournamentUtils.js';

/**
 * Main Tournament Client Handler - orchestrates other handlers and managers
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
        TournamentAdvancementHandler.handleTournamentAdvancement(message, updateGameStatus, gameState);
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
        TournamentAdvancementHandler.handleHideGameElements(message, updateGameStatus, gameState);
    }

    /**
     * Reset tournament game state for clean start
     * @param gameState - Game state object to reset
     */
    static resetTournamentGameState(gameState: {
        isGameOver: boolean;
        isGameLoopRunning: boolean;
    }): void {
        TournamentGameStateManager.resetTournamentGameState(gameState);
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
        TournamentGameStateManager.ensureTournamentElementsVisible(gameState);
    }

    /**
     * Reset paddle positions for tournament games
     * @param player1 - Player 1 paddle
     * @param player2 - Player 2 paddle
     */
    static resetTournamentPaddlePositions(player1: playerPaddle, player2: playerPaddle): void {
        TournamentGameStateManager.resetTournamentPaddlePositions(player1, player2);
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
        return TournamentPlacementHandler.handleSemiFinalGameEnd(gameEndData, localPlayerId, opponentName);
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
        return TournamentPlacementHandler.handleFinalGameEnd(gameEndData, localPlayerId, opponentName, finalPlacement);
    }

    /**
     * Handle automatic tournament victory when player is alone in tournament
     * This happens when all other players disconnect, leaving only one player
     */
    static async handleAutomaticTournamentVictory(
        gameEndData: any,
        localPlayerId: string | null
    ): Promise<void> {
        return TournamentPlacementHandler.handleAutomaticTournamentVictory(gameEndData, localPlayerId);
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
        return TournamentPlacementHandler.handleDirectFinalPlacement(gameEndData, localPlayerId, opponentName, finalPlacement);
    }

    /**
     * Get placement suffix for display (1st, 2nd, 3rd, 4th)
     * @param placement - The placement number
     * @returns The placement suffix string
     */
    static getPlacementSuffix(placement: number): string {
        return TournamentUtils.getPlacementSuffix(placement);
    }

    /**
     * Log tournament client event
     * @param event - Event type
     * @param details - Event details
     */
    static logTournamentEvent(event: string, details: any): void {
        TournamentUtils.logTournamentEvent(event, details);
    }
}

export default TournamentClientHandler; 