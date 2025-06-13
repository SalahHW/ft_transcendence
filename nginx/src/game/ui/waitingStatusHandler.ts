/**
 * Waiting status handler utilities for handling waitingForPlayers messages
 */

import { updatePlayerNames } from '../playerUi/playerUi.js';

/**
 * Handle waiting for players message and update UI accordingly
 * @param message - The waitingForPlayers message from server
 * @param updateGameStatus - Function to update game status display
 */
export function handleWaitingForPlayers(message: any, updateGameStatus: (msg: string) => void): void {
    // Update game status message
    updateGameStatus(`Waiting for players... (${message.readyCount}/${message.totalNeeded} ready)`);
    
    // Update player names UI while waiting
    if (message.currentPlayerName && message.opponentName !== undefined) {
        // Always show current player on the left, opponent on the right
        const player1Name = message.currentPlayerName;
        const player2Name = message.opponentName;
        
        updatePlayerNames(player1Name, player2Name);
    }
}

/**
 * Handle game initialization name display (always current player on left)
 * @param playerName - Current player's name
 * @param opponentName - Opponent's name
 */
export function handleGameInitNames(playerName: string, opponentName: string): void {
    // Always show current player on left, opponent on right for UI consistency
    const player1Name = playerName || 'Player 1';
    const player2Name = opponentName || 'Player 2';
    
    updatePlayerNames(player1Name, player2Name);
} 