/**
 * Player UI utilities for updating game interface elements
 */

/**
 * Helper function to create styled score HTML
 * @param playerName - Player's name
 * @param score - Player's score
 * @param isPlayer1 - Whether this is player 1 (left side, cyan) or player 2 (right side, red)
 */
function createStyledScoreHTML(playerName: string, score: number | string, isPlayer1: boolean): string {
    const nameColor = isPlayer1 ? 'text-cyan-400' : 'text-red-400';
    const scoreColor = isPlayer1 ? 'text-cyan-300' : 'text-red-300';
    
    return `
        <span class="${nameColor}">${playerName}</span>
        <span class="text-white mx-3">:</span>
        <span class="${scoreColor}">${score}</span>
    `;
}

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
        player1Element.innerHTML = createStyledScoreHTML(currentPlayerName, currentPlayer1Score, true);
    }
    if (player2Element) {
        player2Element.innerHTML = createStyledScoreHTML(opponentName, currentPlayer2Score, false);
    }
}

/**
 * Update player names based on paddle positions (left paddle on left side, right paddle on right side)
 * @param leftPaddleName - Name of player with left paddle
 * @param rightPaddleName - Name of player with right paddle
 */
export function updatePlayerNamesByPosition(leftPaddleName: string, rightPaddleName: string): void {
    const player1Element = document.getElementById('player1Score');  // Left side of UI
    const player2Element = document.getElementById('player2Score');  // Right side of UI
    
    // Extract current scores if they exist
    const currentPlayer1Score = player1Element?.textContent?.match(/\d+$/) ? 
        player1Element.textContent.match(/\d+$/)![0] : '0';
    const currentPlayer2Score = player2Element?.textContent?.match(/\d+$/) ? 
        player2Element.textContent.match(/\d+$/)![0] : '0';
    
    // Left paddle name goes to left side of UI (player1Score)
    if (player1Element) {
        player1Element.innerHTML = createStyledScoreHTML(leftPaddleName, currentPlayer1Score, true);
    }
    // Right paddle name goes to right side of UI (player2Score)
    if (player2Element) {
        player2Element.innerHTML = createStyledScoreHTML(rightPaddleName, currentPlayer2Score, false);
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
        player1Element.innerHTML = createStyledScoreHTML(player1Name, currentScore, true);
    }
    if (player2Element) {
        const currentScore = player2Element.textContent?.split(':')[1]?.trim() || '0';
        player2Element.innerHTML = createStyledScoreHTML(player2Name, currentScore, false);
    }
}

/**
 * Update both scores and player names based on paddle positions
 * @param leftPaddleScore - Score for left paddle player
 * @param rightPaddleScore - Score for right paddle player
 * @param leftPaddleName - Name of player with left paddle
 * @param rightPaddleName - Name of player with right paddle
 */
export function updateScoresByPosition(leftPaddleScore: number, rightPaddleScore: number, leftPaddleName: string, rightPaddleName: string): void {
    const player1Element = document.getElementById('player1Score');  // Left side of UI
    const player2Element = document.getElementById('player2Score');  // Right side of UI
    
    // Left paddle info goes to left side of UI (player1Score)
    if (player1Element) {
        player1Element.innerHTML = createStyledScoreHTML(leftPaddleName, leftPaddleScore, true);
    }
    // Right paddle info goes to right side of UI (player2Score)
    if (player2Element) {
        player2Element.innerHTML = createStyledScoreHTML(rightPaddleName, rightPaddleScore, false);
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
        player1Element.innerHTML = createStyledScoreHTML(currentPlayerName, currentPlayerScore, true);
    }
    if (player2Element) {
        player2Element.innerHTML = createStyledScoreHTML(opponentName, opponentScore, false);
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
        player1Element.innerHTML = createStyledScoreHTML(player1Name, player1Score, true);
    }
    if (player2Element) {
        player2Element.innerHTML = createStyledScoreHTML(player2Name, player2Score, false);
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