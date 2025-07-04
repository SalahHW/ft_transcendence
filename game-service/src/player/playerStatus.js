/**
 * Player status utilities for handling 1v1 game player information
 */

/**
 * Determine player and opponent names based on room state
 * @param {Object} room - The game room
 * @param {Object} currentPlayer - The current player
 * @param {number} playerIndex - Index of current player in room.players array
 * @returns {Object} Object with currentPlayerName and opponentName
 */
export function getPlayerDisplayNames(room, currentPlayer, playerIndex) {
    let currentPlayerName = currentPlayer.username || 'Anonymous';
    let opponentName = 'Nobody.';
    
    // Handle 1v1 room scenarios
    if (room.players.length === 1) {
        // Only one player in room
        opponentName = 'Nobody.';
    } else if (room.players.length === 2) {
        // 1v1 room with 2 players
        const otherPlayer = room.players[1 - playerIndex];
        opponentName = otherPlayer.username || 'Anonymous';
    }
    
    return {
        currentPlayerName,
        opponentName
    };
}

/**
 * Create waiting for players message with proper player information
 * @param {Object} room - The game room
 * @param {Object} player - The player to send message to
 * @param {number} playerIndex - Index of player in room.players array
 * @returns {Object} Message object to send to player
 */
export function createWaitingMessage(room, player, playerIndex) {
    const readyPlayers = room.players.filter(p => p.readyToPlay).length;
    const { currentPlayerName, opponentName } = getPlayerDisplayNames(room, player, playerIndex);
    
    return {
        type: 'waitingForPlayers',
        readyCount: readyPlayers,
        totalNeeded: room.maxPlayers,
        currentPlayerName,
        opponentName,
        playerId: player.id,
        role: playerIndex
    };
} 