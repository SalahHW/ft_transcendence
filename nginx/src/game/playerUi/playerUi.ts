/**
 * Player UI utilities for updating game interface elements
 */

/**
 * Update player names in the score display elements
 * @param player1Name - Name of player 1
 * @param player2Name - Name of player 2
 */
export function updatePlayerNames(player1Name: string, player2Name: string): void {
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
 * Update both scores and player names in the UI
 * @param player1Score - Score for player 1
 * @param player2Score - Score for player 2
 * @param player1Name - Name of player 1
 * @param player2Name - Name of player 2
 */
export function updateScoresUI(player1Score: number, player2Score: number, player1Name: string, player2Name: string): void {
    const player1Element = document.getElementById('player1Score');
    const player2Element = document.getElementById('player2Score');
    
    if (player1Element) {
        player1Element.textContent = `${player1Name}: ${player1Score}`;
    }
    if (player2Element) {
        player2Element.textContent = `${player2Name}: ${player2Score}`;
    }
}

/**
 * Update game status message
 * @param message - Status message to display
 */
export function updateGameStatus(message: string): void {
    const statusElement = document.getElementById('gameStatus');
    if (statusElement) {
        statusElement.textContent = message;
    }
} 