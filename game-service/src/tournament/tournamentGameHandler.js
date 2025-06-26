import { tournamentManager } from '../room/tournamentManager.js';

/**
 * Tournament Game Handler
 * Handles tournament-specific game logic and state management
 */
export class TournamentGameHandler {
    
    /**
     * Handle game end for tournament matches
     * @param {Object} room - The room where the game ended
     * @param {string} roomId - The room ID
     * @param {Object} matchData - Match data from game engine
     * @param {Function} broadcastToRoom - Function to broadcast messages to room
     */
    static handleTournamentGameEnd(room, roomId, matchData, broadcastToRoom) {
        // ⭐ TOURNAMENT LOGIC: Handle tournament game completion
        if (tournamentManager.isSemiFinalRoom(room)) {
            console.log(`🏆 Semi-final game completed in room ${roomId}, processing tournament advancement...`);
            
            // Mark game end data as semi-final match for client detection
            const semiMatchData = {
                ...matchData,
                matchType: 'semi-final',
                roomId: roomId,
                gameStats: {
                    ...matchData.gameStats,
                    matchType: 'semi-final'
                }
            };
            
            // ⭐ SEMI-FINAL: Send proper game end message first
            broadcastToRoom(roomId, {
                type: 'gameEnd',
                ...semiMatchData
            });
            
            // ⭐ SEND SEMI-FINAL SOUND EVENTS: Send individual sound events to winner and loser
            // Add a small delay to ensure gameEnd message is processed first
            setTimeout(() => {
                const winnerPlayer = room.players.find(p => p.id === matchData.winner.id);
                const loserPlayer = room.players.find(p => p.id === matchData.loser.id);
                
                if (winnerPlayer && winnerPlayer.ws && winnerPlayer.ws.readyState === 1) {
                    winnerPlayer.ws.send(JSON.stringify({
                        type: 'soundEvent',
                        sound: 'semiFinalWin'
                    }));
                }
                
                if (loserPlayer && loserPlayer.ws && loserPlayer.ws.readyState === 1) {
                    loserPlayer.ws.send(JSON.stringify({
                        type: 'soundEvent',
                        sound: 'semiFinalLose'
                    }));
                }
            }, 100); // 100ms delay to ensure gameEnd is processed first
            
            // ⭐ SEMI-FINAL FIX: Hide game elements immediately for clean map view
            broadcastToRoom(roomId, {
                type: 'hideGameElements',
                message: 'Semi-final completed! Preparing for tournament advancement...',
                hideElements: {
                    ball: true,
                    paddles: true,
                    keepMap: true
                }
            });
            console.log(`🏆 Sent hideGameElements message to semi-final room ${roomId}`);
            
            try {
                tournamentManager.handleSemiFinalCompletion(roomId, semiMatchData);
            } catch (error) {
                console.error(`🏆 Error handling semi-final completion for room ${roomId}:`, error);
            }
        } else if (tournamentManager.isFinalRoom(room)) {
            
            // Mark game end data as final match for client detection
            const finalMatchData = {
                ...matchData,
                matchType: 'final',
                finalMatchType: room.metadata?.finalMatch, // ⭐ CRITICAL: Include final type ('winners' or 'losers')
                roomId: roomId,
                gameStats: {
                    ...matchData.gameStats,
                    matchType: 'final',
                    finalMatchType: room.metadata?.finalMatch // ⭐ CRITICAL: Also in gameStats
                }
            };
            
            console.log(`🏆 DEBUG: Sending finalMatchData with finalMatchType: '${finalMatchData.finalMatchType}'`);
            
            // ⭐ FINAL: Send proper game end message first  
            broadcastToRoom(roomId, {
                type: 'gameEnd',
                ...finalMatchData
            });
            console.log(`🏆 Sent gameEnd message for final room ${roomId} with finalMatchType: '${finalMatchData.finalMatchType}'`);
            
            // ⭐ SEND FINAL PLACEMENT SOUND EVENTS: Send individual sound events based on placement
            const winnerPlayer = room.players.find(p => p.id === matchData.winner.id);
            const loserPlayer = room.players.find(p => p.id === matchData.loser.id);
            const isWinnersFinal = room.metadata?.finalMatch === 'winners';
            const isLosersFinal = room.metadata?.finalMatch === 'losers';
            
            let winnerSound, loserSound;
            if (isWinnersFinal) {
                // Winners final: 1st place winner, 2nd place loser
                winnerSound = 'firstPlace';
                loserSound = 'secondPlace';
            } else if (isLosersFinal) {
                // Losers final: 3rd place winner, 4th place loser
                winnerSound = 'thirdPlace';
                loserSound = 'fourthPlace';
            } else {
                // Fallback to winners final
                winnerSound = 'firstPlace';
                loserSound = 'secondPlace';
            }
            
            if (winnerPlayer && winnerPlayer.ws && winnerPlayer.ws.readyState === 1) {
                winnerPlayer.ws.send(JSON.stringify({
                    type: 'soundEvent',
                    sound: winnerSound
                }));
                console.log(`🏆 Sent ${winnerSound} sound to winner: ${matchData.winner.username}`);
            }
            
            if (loserPlayer && loserPlayer.ws && loserPlayer.ws.readyState === 1) {
                loserPlayer.ws.send(JSON.stringify({
                    type: 'soundEvent',
                    sound: loserSound
                }));
                console.log(`🏆 Sent ${loserSound} sound to loser: ${matchData.loser.username}`);
            }
            
            // Broadcast final game end with match type
            broadcastToRoom(roomId, {
                type: 'tournamentGameEnd',
                matchType: 'final', // Ensure this is set for detection
                finalMatchType: room.metadata?.finalMatch, // ⭐ CRITICAL: Include final type here too
                ...finalMatchData,
                message: 'Tournament final completed!'
            });
            
            try {
                tournamentManager.handleFinalCompletion(roomId, matchData);
            } catch (error) {
                console.error(`🏆 Error handling final completion for room ${roomId}:`, error);
            }
        }
    }

    /**
     * Check if a room is tournament-related
     * @param {Object} room - The room to check
     * @returns {boolean} - True if tournament room
     */
    static isTournamentRoom(room) {
        return room.metadata?.isTournament === true;
    }

    /**
     * Check if a room is a semi-final room
     * @param {Object} room - The room to check
     * @returns {boolean} - True if semi-final room
     */
    static isSemiFinalRoom(room) {
        return room.metadata?.tournamentType === 'semifinal';
    }

    /**
     * Check if a room is a final room
     * @param {Object} room - The room to check
     * @returns {boolean} - True if final room
     */
    static isFinalRoom(room) {
        return room.metadata?.tournamentType === 'final';
    }

    /**
     * Get tournament room type as string
     * @param {Object} room - The room to check
     * @returns {string} - Room type ('waiting', 'semifinal', 'final', 'regular')
     */
    static getTournamentRoomType(room) {
        if (!this.isTournamentRoom(room)) {
            return 'regular';
        }
        
        return room.metadata?.tournamentType || 'waiting';
    }

    /**
     * Log tournament match completion
     * @param {Object} matchData - Match data
     * @param {string} roomType - Type of tournament room
     */
    static logTournamentMatchCompletion(matchData, roomType) {
        console.log('🏆'.repeat(30));
        console.log(`🏆 TOURNAMENT ${roomType.toUpperCase()} COMPLETED`);
        console.log('🏆'.repeat(30));
        console.log(`🏆 Room ID: ${matchData.roomId}`);
        console.log(`🏆 Winner: ${matchData.winner.username} (${matchData.winner.score})`);
        console.log(`🏆 Loser: ${matchData.loser.username} (${matchData.loser.score})`);
        console.log(`🏆 Final Score: ${matchData.winner.score}-${matchData.loser.score}`);
        console.log(`🏆 Match Duration: ${matchData.matchDuration}ms`);
        console.log('🏆'.repeat(30));
    }
} 