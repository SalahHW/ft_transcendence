/**
 * Player status utilities for handling tournament and regular game player information
 */

/**
 * Determine player and opponent names based on room state and tournament structure
 * @param {Object} room - The game room
 * @param {Object} currentPlayer - The current player
 * @param {number} playerIndex - Index of current player in room.players array
 * @returns {Object} Object with currentPlayerName and opponentName
 */
export function getPlayerDisplayNames(room, currentPlayer, playerIndex) {
    const isTournamentRoom = room.metadata?.isTournament === true;
    let currentPlayerName = currentPlayer.username || 'Anonymous';
    let opponentName = 'Nobody.';
    
    // Handle different room scenarios
    if (room.players.length === 1) {
        // Only one player in room
        opponentName = 'Nobody.';
    } else if (room.players.length === 2 && !isTournamentRoom) {
        // Regular 1v1 room with 2 players
        const otherPlayer = room.players[1 - playerIndex];
        opponentName = otherPlayer.username || 'Anonymous';
    } else if (room.players.length === 2 && isTournamentRoom) {
        // Tournament room with 2 players (will be opponents in semi-final)
        const otherPlayer = room.players[1 - playerIndex];
        opponentName = otherPlayer.username || 'Anonymous';
    } else if (isTournamentRoom && room.players.length > 2) {
        // Tournament waiting room with 3+ players
        // Show semi-final pairings: [0 vs 1] and [2 vs 3]
        let opponentIndex = -1;
        if (playerIndex === 0) {
            opponentIndex = 1; // Player 0 faces Player 1
        } else if (playerIndex === 1) {
            opponentIndex = 0; // Player 1 faces Player 0
        } else if (playerIndex === 2) {
            opponentIndex = 3; // Player 2 faces Player 3
        } else if (playerIndex === 3) {
            opponentIndex = 2; // Player 3 faces Player 2
        }
        
        // Set opponent name based on pairing
        if (opponentIndex >= 0 && opponentIndex < room.players.length) {
            opponentName = room.players[opponentIndex].username || 'Anonymous';
        } else {
            opponentName = 'Nobody.'; // Waiting for their opponent to join
        }
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
    const isTournamentRoom = room.metadata?.isTournament === true;
    const { currentPlayerName, opponentName } = getPlayerDisplayNames(room, player, playerIndex);
    
    return {
        type: 'waitingForPlayers',
        readyCount: readyPlayers,
        totalNeeded: room.maxPlayers,
        currentPlayerName,
        opponentName,
        playerId: player.id,
        role: playerIndex,
        isTournament: isTournamentRoom,
        tournamentPlayerCount: isTournamentRoom ? room.players.length : undefined
    };
} 