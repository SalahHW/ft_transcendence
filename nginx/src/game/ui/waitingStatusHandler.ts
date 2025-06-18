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
    // Check if this is a tournament advancement message
    if (message.tournamentAdvancement) {
        handleTournamentAdvancement(message, updateGameStatus);
        return;
    }
    
    // Regular waiting for players message
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
 * Handle tournament advancement waiting messages
 * @param message - The tournament advancement message from server
 * @param updateGameStatus - Function to update game status display
 */
function handleTournamentAdvancement(message: any, updateGameStatus: (msg: string) => void): void {
    const advancement = message.tournamentAdvancement;
    
    if (advancement.status === 'waiting_for_final') {
        // Player has been transferred to final room, waiting for opponent
        updateGameStatus(advancement.message);
        
        // Update player names - show current player vs "waiting for opponent"
        updatePlayerNamesVersus(
            message.currentPlayerName || 'You',
            message.opponentName === 'Nobody' ? 'Waiting for opponent...' : message.opponentName
        );
        
        console.log(`🏆 Tournament advancement: ${advancement.playerType} in ${advancement.finalRoomType}`);
    } else if (advancement.status === 'final_ready') {
        // Both players are in final room, ready to start
        updateGameStatus(advancement.message);
        
        // Update player names with actual opponent
        updatePlayerNamesVersus(
            message.currentPlayerName || 'You',
            message.opponentName || 'Opponent'
        );
        
        console.log(`🏆 Final room ready: ${advancement.finalRoomType}`);
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