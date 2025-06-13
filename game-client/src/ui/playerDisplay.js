/**
 * Player display utilities for updating UI elements with player information
 */

/**
 * Update player names in the UI score display elements
 * @param {string} player1Name - Name to display on the left side
 * @param {string} player2Name - Name to display on the right side
 */
export function updatePlayerNames(player1Name, player2Name) {
    const player1Element = document.getElementById('player1Score');
    const player2Element = document.getElementById('player2Score');
    
    if (player1Element) {
        const currentScore = player1Element.textContent?.split(':')[1]?.trim() || '0';
        player1Element.textContent = `${player1Name}: ${currentScore}`;
    }
    if (player2Element) {
        const currentScore = player2Element.textContent?.split(':')[1]?.trim() || '0';
        player2Element.textContent = `${player2Name}: ${currentScore}`;
    }
}

/**
 * Handle waiting for players message and update UI accordingly
 * @param {Object} message - The waitingForPlayers message from server
 * @param {Function} updateGameStatus - Function to update game status display
 */
export function handleWaitingForPlayers(message, updateGameStatus) {
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
 * @param {string} playerName - Current player's name
 * @param {string} opponentName - Opponent's name
 */
export function handleGameInitNames(playerName, opponentName) {
    // Always show current player on left, opponent on right for UI consistency
    const player1Name = playerName || 'Player 1';
    const player2Name = opponentName || 'Player 2';
    
    updatePlayerNames(player1Name, player2Name);
} 