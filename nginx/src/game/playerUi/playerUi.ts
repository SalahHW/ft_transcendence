/**
 * Player UI utilities for updating game interface elements
 */

/**
 * Update player names display in "vs" format from current player's perspective
 * @param currentPlayerName - Current player's name (will be shown first)
 * @param opponentName - Opponent's name (will be shown second)
 */
export function updatePlayerNamesVersus(currentPlayerName: string, opponentName: string): void {
    const player1Element = document.getElementById('player1Score');
    const player2Element = document.getElementById('player2Score');
    
    // Extract current scores if they exist
    const currentPlayer1Score = player1Element?.textContent?.match(/\d+$/) ? 
        player1Element.textContent.match(/\d+$/)![0] : '0';
    const currentPlayer2Score = player2Element?.textContent?.match(/\d+$/) ? 
        player2Element.textContent.match(/\d+$/)![0] : '0';
    
    if (player1Element) {
        player1Element.textContent = `${currentPlayerName}: ${currentPlayer1Score}`;
    }
    if (player2Element) {
        player2Element.textContent = `${opponentName}: ${currentPlayer2Score}`;
    }
}

/**
 * Update player names in the score display elements (legacy function - kept for backwards compatibility)
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
 * Update both scores and player names in the UI from current player's perspective
 * @param currentPlayerScore - Current player's score
 * @param opponentScore - Opponent's score
 * @param currentPlayerName - Current player's name
 * @param opponentName - Opponent's name
 */
export function updateScoresUIVersus(currentPlayerScore: number, opponentScore: number, currentPlayerName: string, opponentName: string): void {
    const player1Element = document.getElementById('player1Score');
    const player2Element = document.getElementById('player2Score');
    
    if (player1Element) {
        player1Element.textContent = `${currentPlayerName}: ${currentPlayerScore}`;
    }
    if (player2Element) {
        player2Element.textContent = `${opponentName}: ${opponentScore}`;
    }
}

/**
 * Update both scores and player names in the UI (legacy function - kept for backwards compatibility)
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