/**
 * Waiting status handler utilities for handling waitingForPlayers messages
 */

import { updatePlayerNamesVersus } from '../playerUi/playerUi.js';

// Global variables for ping management
let forfeitPingInterval: number | null = null;

/**
 * Handle waiting for players message and update UI accordingly
 * @param message - The waitingForPlayers message from server
 * @param updateGameStatus - Function to update game status display
 */
export function handleWaitingForPlayers(message: any, updateGameStatus: (msg: string) => void): void {
    console.log('handleWaitingForPlayers called with message:', message);
    
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
 * Start keep-alive pinging to prevent timeout during waiting
 */
function startForfeitWinnerPing(): void {
    console.log('Starting forfeit winner keep-alive ping (every 30s)');
    
    // Clear any existing interval
    if (forfeitPingInterval) {
        clearInterval(forfeitPingInterval);
        console.log('Cleared existing ping interval');
    }
    
    // Send ping every 30 seconds
    forfeitPingInterval = window.setInterval(() => {
        const clientConnection = (window as any).clientConnection;
        console.log('Ping interval triggered, checking connection...');
        console.log('clientConnection exists:', !!clientConnection);
        console.log('socket exists:', !!clientConnection?.socket);
        console.log('socket readyState:', clientConnection?.socket?.readyState);
        
        if (clientConnection?.socket?.readyState === WebSocket.OPEN) {
            const pingMessage = {
                type: 'keepAlive',
                reason: 'waiting_for_opponent',
                timestamp: Date.now()
            };
            clientConnection.send(pingMessage);
            console.log('Sent keep-alive ping:', pingMessage);
        } else {
            console.log('Stopping ping - connection closed or invalid');
            stopForfeitWinnerPing();
        }
    }, 30000); // 30 seconds
    
    console.log('Ping interval set with ID:', forfeitPingInterval);
}

/**
 * Stop keep-alive pinging
 */
export function stopForfeitWinnerPing(): void {
    if (forfeitPingInterval) {
        clearInterval(forfeitPingInterval);
        forfeitPingInterval = null;
        console.log('Stopped forfeit winner keep-alive ping');
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