/**
 * Waiting status handler utilities for handling waitingForPlayers messages
 */

import { updatePlayerNamesVersus } from '../playerUi/playerUi.js';

// 🏆 FORFEIT WINNER PING: Global variables for ping management
let forfeitPingInterval: number | null = null;

/**
 * Handle waiting for players message and update UI accordingly
 * @param message - The waitingForPlayers message from server
 * @param updateGameStatus - Function to update game status display
 */
export function handleWaitingForPlayers(message: any, updateGameStatus: (msg: string) => void): void {
    console.log('🏆 handleWaitingForPlayers called with message:', message);
    
    // Check if this is a tournament advancement message
    if (message.tournamentAdvancement) {
        console.log('🏆 Tournament advancement detected:', message.tournamentAdvancement);
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
    console.log('🏆 handleTournamentAdvancement called with advancement:', advancement);
    
    if (advancement.status === 'waiting_for_final') {
        // Player has been transferred to final room, waiting for opponent
        updateGameStatus(advancement.message);
        
        // Update player names - show current player vs "waiting for opponent"
        updatePlayerNamesVersus(
            message.currentPlayerName || 'You',
            message.opponentName === 'Nobody' ? 'Waiting for opponent...' : message.opponentName
        );
        
        console.log(`🏆 Tournament advancement: ${advancement.playerType} in ${advancement.finalRoomType}`);
    } else if (advancement.status === 'waiting_for_final_after_forfeit') {
        // 🏆 FORFEIT WINNER PING: Start keep-alive pinging to prevent 60s timeout
        console.log('🏆 FORFEIT WINNER DETECTED - Starting ping functionality!');
        startForfeitWinnerPing();
        updateGameStatus(advancement.message);
        
        // Update player names - show current player vs "waiting for opponent"
        updatePlayerNamesVersus(
            message.currentPlayerName || 'You',
            message.opponentName === 'Nobody' ? 'Waiting for opponent...' : message.opponentName
        );
        
        console.log(`🏆 Tournament advancement: ${advancement.playerType} in ${advancement.finalRoomType} (forfeit winner)`);
    } else if (advancement.status === 'final_ready') {
        // Both players are in final room, ready to start
        updateGameStatus(advancement.message);
        
        // Update player names with actual opponent
        updatePlayerNamesVersus(
            message.currentPlayerName || 'You',
            message.opponentName || 'Opponent'
        );
        
        console.log(`🏆 Final room ready: ${advancement.finalRoomType}`);
    } else {
        console.log('🏆 Unknown tournament advancement status:', advancement.status);
    }
}

/**
 * 🏆 FORFEIT WINNER PING: Start keep-alive pinging to prevent 60s timeout
 */
function startForfeitWinnerPing(): void {
    console.log('🏆 Starting forfeit winner keep-alive ping (every 30s)');
    
    // Clear any existing interval
    if (forfeitPingInterval) {
        clearInterval(forfeitPingInterval);
        console.log('🏆 Cleared existing ping interval');
    }
    
    // Send ping every 30 seconds
    forfeitPingInterval = window.setInterval(() => {
        const clientConnection = (window as any).clientConnection;
        console.log('🏆 Ping interval triggered, checking connection...');
        console.log('🏆 clientConnection exists:', !!clientConnection);
        console.log('🏆 socket exists:', !!clientConnection?.socket);
        console.log('🏆 socket readyState:', clientConnection?.socket?.readyState);
        
        if (clientConnection?.socket?.readyState === WebSocket.OPEN) {
            const pingMessage = {
                type: 'keepAlive',
                reason: 'forfeit_winner_waiting',
                timestamp: Date.now()
            };
            clientConnection.send(pingMessage);
            console.log('🏆 Sent forfeit winner keep-alive ping:', pingMessage);
        } else {
            console.log('🏆 Stopping forfeit winner ping - connection closed or invalid');
            stopForfeitWinnerPing();
        }
    }, 30000); // 30 seconds
    
    console.log('🏆 Ping interval set with ID:', forfeitPingInterval);
}

/**
 * 🏆 FORFEIT WINNER PING: Stop keep-alive pinging
 */
export function stopForfeitWinnerPing(): void {
    if (forfeitPingInterval) {
        clearInterval(forfeitPingInterval);
        forfeitPingInterval = null;
        console.log('🏆 Stopped forfeit winner keep-alive ping');
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