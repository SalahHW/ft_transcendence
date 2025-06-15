/**
 * Waiting status handler utilities for handling waitingForPlayers messages
 */

import { updatePlayerNamesVersus } from '../playerUi/playerUi.js';

/**
 * Handle waiting for players message and update UI accordingly
 * @param message - The waitingForPlayers message from server
 * @param updateGameStatus - Function to update game status display
 */
export function handleWaitingForPlayers(message: any, updateGameStatus: (msg: string) => void): void {
    // Update game status message
    updateGameStatus(`Waiting for players... (${message.readyCount}/${message.totalNeeded} ready)`);
    
    // Update player names UI while waiting - always show current player vs opponent
    if (message.currentPlayerName) {
        const currentPlayerName = message.currentPlayerName;
        // Normalize "Nobody." to "Nobody" for consistent display
        const rawOpponentName = message.opponentName || 'Nobody';
        const opponentName = rawOpponentName === 'Nobody.' ? 'Nobody' : rawOpponentName;
        
        updatePlayerNamesVersus(currentPlayerName, opponentName);
    }
}

/**
 * Handle game initialization name display (always current player first)
 * @param playerName - Current player's name
 * @param opponentName - Opponent's name
 */
export function handleGameInitNames(playerName: string, opponentName: string): void {
    // Always show current player first, opponent second for UI consistency
    const currentPlayerName = playerName || 'Player';
    const opponent = opponentName || 'Opponent';
    
    updatePlayerNamesVersus(currentPlayerName, opponent);
} 