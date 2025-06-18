import { roomManager } from './RoomManager.js';
import { gameEngine } from '../game/GameEngine.js';

/**
 * Handles tournament-specific room management and matchmaking
 */
export class TournamentManager {
  constructor() {
    this.roomManager = roomManager;
    this._tournamentCounter = 0; // Counter for unique tournament IDs
  }

  /**
   * Generate a unique tournament identifier
   * @returns {string} - Unique tournament ID
   */
  _generateTournamentId() {
    const timestamp = Date.now().toString(36);
    const counter = (this._tournamentCounter = (this._tournamentCounter || 0) + 1).toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `tournament_${timestamp}_${counter}_${random}`;
  }

  /**
   * Find suitable tournament room for a player with enhanced isolation
   */
  findSuitableTournamentRoom(player, preferences = {}) {
    const availableRooms = this.roomManager.getAvailableRooms();
    
    // Filter for tournament rooms only
    const tournamentRooms = availableRooms.filter(room => {
      // Must be a tournament room
      if (!room.metadata?.isTournament) return false;
      
      // Must be waiting room (not semi-final or final)
      if (room.metadata?.tournamentType !== 'elimination') return false;
      
      // Must not be full (less than 4 players)
      if (room.players.length >= 4) return false;
      
      // Must not have any non-tournament players
      const hasNonTournamentPlayers = room.players.some(p => !p.tournament);
      if (hasNonTournamentPlayers) return false;
      
      // Room must not be in an advanced state
      if (room.metadata?.status === 'split_into_semifinals') return false;
      
      return true;
    });

    // Return the first available tournament room, or null if none found
    return tournamentRooms.length > 0 ? tournamentRooms[0] : null;
  }

  /**
   * Create a new tournament room with unique tournament-specific naming
   */
  createTournamentRoom(player, preferences = {}) {
    console.log(`🏆 Creating new tournament room for player ${player.id}`);
    
    // Generate unique tournament ID for this tournament group
    const tournamentId = this._generateTournamentId();
    
    const room = this.roomManager.createRoom(null, {
      maxPlayers: 4,
      gameMode: 'tournament',
      metadata: {
        isTournament: true,
        createdBy: player.id,
        tournamentType: 'elimination',
        tournamentId: tournamentId, // Unique tournament identifier
        createdAt: new Date().toISOString(),
        preferences
      }
    });
    
    console.log(`🏆 Tournament room ${room.id} created successfully with tournament ID ${tournamentId}`);
    return room;
  }

  /**
   * Handle tournament player room assignment
   * @param {Object} player - The tournament player
   * @param {Object} preferences - Player preferences
   * @returns {Object} - Room assignment result { room, roomId, role }
   */
  handleTournamentPlayer(player, preferences = {}) {
    console.log(`🏆 Processing tournament player ${player.id} (${player.username})`);
    
    // Try to find existing tournament room
    let room = this.findSuitableTournamentRoom(player, preferences);
    
    // If no suitable room found, create a new one
    if (!room) {
      console.log(`🏆 No suitable tournament room found for ${player.id}, creating new tournament`);
      room = this.createTournamentRoom(player, preferences);
    } else {
      console.log(`🏆 Found suitable tournament room ${room.id} (tournament ${room.metadata.tournamentId}) for ${player.id}`);
    }
    
    // Add player to room
    const role = room.addPlayer(player);
    
    console.log(`🏆 Tournament player ${player.id} assigned to room ${room.id} (tournament ${room.metadata.tournamentId}) as role ${role} (${room.players.length}/4 players)`);
    
    // ⭐ CHECK IF ROOM IS FULL: Split into semi-finals when 4 players reached
    if (room.players.length === 4) {
      console.log(`🏆 Tournament room ${room.id} (tournament ${room.metadata.tournamentId}) is full! Creating semi-final matches...`);
      this.createSemiFinalMatches(room);
      
      // Find which semi-final room this player was assigned to
      const tournamentId = room.metadata.tournamentId;
      const semiFinalRoomA = this.roomManager.getRoom(`${tournamentId}_sf_A`);
      const semiFinalRoomB = this.roomManager.getRoom(`${tournamentId}_sf_B`);
      
      if (semiFinalRoomA && semiFinalRoomA.players.some(p => p.id === player.id)) {
        console.log(`🏆 Player ${player.id} assigned to Semi-Final A: ${semiFinalRoomA.id}`);
        return {
          room: semiFinalRoomA,
          roomId: semiFinalRoomA.id,
          role: semiFinalRoomA.players.findIndex(p => p.id === player.id)
        };
      } else if (semiFinalRoomB && semiFinalRoomB.players.some(p => p.id === player.id)) {
        console.log(`🏆 Player ${player.id} assigned to Semi-Final B: ${semiFinalRoomB.id}`);
        return {
          room: semiFinalRoomB,
          roomId: semiFinalRoomB.id,
          role: semiFinalRoomB.players.findIndex(p => p.id === player.id)
        };
      }
    }
    
    return {
      room,
      roomId: room.id,
      role
    };
  }

  /**
   * Create semi-final matches when tournament room is full (4 players)
   * @param {Object} waitingRoom - The full tournament waiting room
   */
  createSemiFinalMatches(waitingRoom) {
    const players = [...waitingRoom.players]; // Copy players array
    
    if (players.length !== 4) {
      console.error(`🏆 Cannot create semi-finals: Expected 4 players, got ${players.length}`);
      return;
    }
    
    console.log(`🏆 Splitting tournament room ${waitingRoom.id} into semi-final matches...`);
    
    // Use tournament ID for isolated room naming
    const tournamentId = waitingRoom.metadata.tournamentId;
    const baseId = `${tournamentId}_sf`; // semifinal
    
    // Create Semi-Final Room A (first 2 players)
    const roomAId = `${baseId}_A`;
    const semiFinalA = this.roomManager.createRoom(roomAId, {
      maxPlayers: 2,
      gameMode: 'tournament-semifinal',
      metadata: {
        isTournament: true,
        tournamentType: 'semifinal',
        tournamentId: tournamentId,
        parentRoom: waitingRoom.id,
        semiFinalMatch: 'A',
        createdAt: new Date().toISOString(),
        waitingRoomPlayers: players.map(p => ({ id: p.id, username: p.username }))
      }
    });
    
    // Create Semi-Final Room B (last 2 players)
    const roomBId = `${baseId}_B`;
    const semiFinalB = this.roomManager.createRoom(roomBId, {
      maxPlayers: 2,
      gameMode: 'tournament-semifinal',
      metadata: {
        isTournament: true,
        tournamentType: 'semifinal',
        tournamentId: tournamentId,
        parentRoom: waitingRoom.id,
        semiFinalMatch: 'B',
        createdAt: new Date().toISOString(),
        waitingRoomPlayers: players.map(p => ({ id: p.id, username: p.username }))
      }
    });
    
    // Assign players to semi-final rooms
    console.log(`🏆 Semi-Final A (${roomAId}): ${players[0].username} vs ${players[1].username}`);
    semiFinalA.addPlayer(players[0]);
    semiFinalA.addPlayer(players[1]);
    
    console.log(`🏆 Semi-Final B (${roomBId}): ${players[2].username} vs ${players[3].username}`);
    semiFinalB.addPlayer(players[2]);
    semiFinalB.addPlayer(players[3]);
    
    // ⭐ CRITICAL: Update player room associations and WebSocket connections
    this._updatePlayerRoomAssociations(players, roomAId, roomBId);
    
    // Remove players from waiting room (clean up)
    waitingRoom.players = [];
    waitingRoom.metadata.status = 'split_into_semifinals';
    waitingRoom.metadata.semiFinalRooms = [roomAId, roomBId];
    
    // ⭐ CREATE FINAL ROOMS: Create empty final rooms for winners
    const finalRoomAId = `${tournamentId}_final_winners`; // Winner finals
    const finalRoomBId = `${tournamentId}_final_losers`; // Loser finals (3rd place)
    
    console.log(`🏆 Creating final rooms: ${finalRoomAId} and ${finalRoomBId}...`);
    
    // Create Final Room A (for winner of Semi-Final A vs winner of Semi-Final B)
    const finalRoomA = this.roomManager.createRoom(finalRoomAId, {
      maxPlayers: 2,
      gameMode: 'tournament-final',
      metadata: {
        isTournament: true,
        tournamentType: 'final',
        tournamentId: tournamentId,
        parentRoom: waitingRoom.id,
        finalMatch: 'winners',
        createdAt: new Date().toISOString(),
        waitingForWinners: true,
        semiFinalRoomA: roomAId,
        semiFinalRoomB: roomBId,
        waitingRoomPlayers: players.map(p => ({ id: p.id, username: p.username }))
      }
    });
    
    // Create Final Room B (for loser of Semi-Final A vs loser of Semi-Final B)
    const finalRoomB = this.roomManager.createRoom(finalRoomBId, {
      maxPlayers: 2,
      gameMode: 'tournament-final',
      metadata: {
        isTournament: true,
        tournamentType: 'final',
        tournamentId: tournamentId,
        parentRoom: waitingRoom.id,
        finalMatch: 'losers',
        createdAt: new Date().toISOString(),
        waitingForWinners: true,
        semiFinalRoomA: roomAId,
        semiFinalRoomB: roomBId,
        waitingRoomPlayers: players.map(p => ({ id: p.id, username: p.username }))
      }
    });
    
    console.log(`🏆 Final rooms created: ${finalRoomAId} and ${finalRoomBId} (waiting for winners)`);
    
    // Update semi-final rooms with references to final rooms
    semiFinalA.metadata.finalRoomA = finalRoomAId;
    semiFinalA.metadata.finalRoomB = finalRoomBId;
    semiFinalB.metadata.finalRoomA = finalRoomAId;
    semiFinalB.metadata.finalRoomB = finalRoomBId;
    
    // Update waiting room metadata with all created rooms
    waitingRoom.metadata.finalRooms = [finalRoomAId, finalRoomBId];
    
    // ⭐ CRITICAL: Trigger game initialization for both semi-final rooms
    console.log(`🏆 Triggering game initialization for semi-final rooms...`);
    gameEngine.checkRoomReady(roomAId);
    gameEngine.checkRoomReady(roomBId);
    
    console.log(`🏆 Tournament waiting room ${waitingRoom.id} split successfully!`);
    console.log(`🏆 Tournament ${tournamentId}: Semi-Final A: ${roomAId} | Semi-Final B: ${roomBId}`);
    console.log(`🏆 Tournament ${tournamentId}: Final Rooms: ${finalRoomAId} and ${finalRoomBId} (empty, waiting for winners)`);
  }

  /**
   * Update player room associations when moving to semi-final rooms
   * @param {Array} players - Array of 4 players from waiting room
   * @param {string} roomAId - Semi-final room A ID
   * @param {string} roomBId - Semi-final room B ID
   */
  _updatePlayerRoomAssociations(players, roomAId, roomBId) {
    console.log(`🏆 Updating player room associations...`);
    
    // Update players 0 and 1 to room A
    [players[0], players[1]].forEach((player, index) => {
      if (player.ws) {
        player.ws.roomId = roomAId;
        player.roomId = roomAId;
        console.log(`🏆 Player ${player.id} (${player.username}) moved to Semi-Final A: ${roomAId}`);
      }
    });
    
    // Update players 2 and 3 to room B
    [players[2], players[3]].forEach((player, index) => {
      if (player.ws) {
        player.ws.roomId = roomBId;
        player.roomId = roomBId;
        console.log(`🏆 Player ${player.id} (${player.username}) moved to Semi-Final B: ${roomBId}`);
      }
    });
    
    console.log(`🏆 Player room associations updated successfully`);
  }

  /**
   * Check if a room is a tournament room
   * @param {Object} room - The room to check
   * @returns {boolean} - True if tournament room
   */
  isTournamentRoom(room) {
    return room.metadata?.isTournament === true;
  }

  /**
   * Check if a room is a semi-final room
   * @param {Object} room - The room to check
   * @returns {boolean} - True if semi-final room
   */
  isSemiFinalRoom(room) {
    return room.metadata?.tournamentType === 'semifinal';
  }

  /**
   * Check if a room is a final room
   * @param {Object} room - The room to check
   * @returns {boolean} - True if final room
   */
  isFinalRoom(room) {
    return room.metadata?.tournamentType === 'final';
  }

  /**
   * Handle semi-final game completion and transfer players to final rooms
   * @param {string} semiFinalRoomId - The semi-final room that just ended
   * @param {Object} matchData - Match data from game engine
   */
  handleSemiFinalCompletion(semiFinalRoomId, matchData) {
    const semiFinalRoom = this.roomManager.getRoom(semiFinalRoomId);
    if (!semiFinalRoom || !this.isSemiFinalRoom(semiFinalRoom)) {
      console.log(`🏆 Room ${semiFinalRoomId} is not a semi-final room, skipping tournament logic`);
      return;
    }

    console.log(`🏆 Semi-final ${semiFinalRoomId} completed! Processing tournament advancement...`);
    
    const winner = matchData.winner;
    const loser = matchData.loser;
    const finalRoomAId = semiFinalRoom.metadata.finalRoomA;
    const finalRoomBId = semiFinalRoom.metadata.finalRoomB;
    
    if (!finalRoomAId || !finalRoomBId) {
      console.error(`🏆 Final rooms not found for semi-final ${semiFinalRoomId}`);
      return;
    }

    const finalRoomA = this.roomManager.getRoom(finalRoomAId);
    const finalRoomB = this.roomManager.getRoom(finalRoomBId);
    
    if (!finalRoomA || !finalRoomB) {
      console.error(`🏆 Cannot find final rooms: ${finalRoomAId} or ${finalRoomBId}`);
      return;
    }

    // Find the actual player objects
    const winnerPlayer = semiFinalRoom.players.find(p => p.id === winner.id);
    const loserPlayer = semiFinalRoom.players.find(p => p.id === loser.id);
    
    if (!winnerPlayer || !loserPlayer) {
      console.error(`🏆 Cannot find winner or loser player objects in room ${semiFinalRoomId}`);
      return;
    }

    // Transfer players to final rooms
    // Winners always go to finalRoomA (AFS), Losers always go to finalRoomB (BTF)
    this._transferPlayerToFinalRoom(winnerPlayer, finalRoomA, semiFinalRoomId, 'winner');
    this._transferPlayerToFinalRoom(loserPlayer, finalRoomB, semiFinalRoomId, 'loser');
    
    // Clean up the semi-final room
    semiFinalRoom.players = [];
    semiFinalRoom.metadata.status = 'completed';
    semiFinalRoom.metadata.playersTransferred = true;
    
    console.log(`🏆 Semi-final ${semiFinalRoomId} completed: Winner ${winner.username} → ${finalRoomAId}, Loser ${loser.username} → ${finalRoomBId}`);
  }

  /**
   * Transfer a player to a final room in waiting state
   * @param {Object} player - The player to transfer
   * @param {Object} finalRoom - The final room to transfer to
   * @param {string} fromRoomId - The room the player is coming from
   * @param {string} playerType - 'winner' or 'loser'
   */
  _transferPlayerToFinalRoom(player, finalRoom, fromRoomId, playerType) {
    console.log(`🏆 Transferring ${playerType} ${player.username} from ${fromRoomId} to ${finalRoom.id}`);
    
    // Reset player state for new game
    player.readyToPlay = false; // Put in waiting state
    player.score = 0; // Reset score
    player.playerScore = 0; // Reset tournament score tracking
    player.gamesWon = player.gamesWon || 0; // Preserve overall stats but reset match score
    player.paddlePosition = { x: 0, y: 0, z: 0 }; // Reset paddle position
    player.positionZ = 0; // Reset server-side paddle Z position for sync
    
    console.log(`🏆 Player ${player.username} scores reset: score=${player.score}, playerScore=${player.playerScore}`);
    
    // Update WebSocket room association
    if (player.ws) {
      player.ws.roomId = finalRoom.id;
      player.roomId = finalRoom.id;
    }
    
    // Add player to final room
    const role = finalRoom.addPlayer(player);
    
    console.log(`🏆 Player ${player.username} added to ${finalRoom.id} with role ${role} (${finalRoom.players.length}/2 players)`);
    
    // ⭐ TOURNAMENT FIX: Send immediate position sync to ensure client/server alignment
    if (player.ws && player.ws.readyState === 1) {
      try {
        const syncMessage = {
          type: 'sync',
          playerPositions: {
            [player.id]: player.positionZ // Should be 0 after reset
          }
        };
        player.ws.send(JSON.stringify(syncMessage));
        console.log(`🏆 Sent position sync to ${player.username}: Z=${player.positionZ}`);
      } catch (e) {
        console.error(`🏆 Failed to send position sync to ${player.username}:`, e);
      }
    }
    
    // Send waiting state message to player (using standard waitingForPlayers format)
    if (player.ws && player.ws.readyState === 1) {
      try {
        const waitingMessage = {
          type: 'waitingForPlayers',
          readyCount: finalRoom.players.length,
          totalNeeded: finalRoom.maxPlayers,
          currentPlayerName: player.username || 'Anonymous',
          opponentName: finalRoom.players.length === 2 
            ? finalRoom.players.find(p => p.id !== player.id)?.username || 'Opponent'
            : 'Nobody',
          playerId: player.id,
          role: role,
          isTournament: true,
          tournamentPlayerCount: finalRoom.players.length,
          tournamentAdvancement: {
            status: 'waiting_for_final',
            playerType: playerType,
            message: playerType === 'winner' 
              ? `Congratulations! You advanced to the final. Waiting for your opponent...`
              : `You'll play for 3rd place. Waiting for your opponent...`,
            finalRoomType: finalRoom.metadata.finalMatch
          }
        };
        
        player.ws.send(JSON.stringify(waitingMessage));
        console.log(`🏆 Sent tournament advancement waiting message to ${player.username}`);
        
        // Also send a custom tournament advancement message for any additional client handling
        const advancementMessage = {
          type: 'tournamentAdvancement',
          status: 'transferred_to_final',
          roomId: finalRoom.id,
          role: role,
          playerType: playerType,
          message: playerType === 'winner' 
            ? `Congratulations! You advanced to the final. Waiting for your opponent...`
            : `You'll play for 3rd place. Waiting for your opponent...`,
          finalRoomType: finalRoom.metadata.finalMatch,
          playersInRoom: finalRoom.players.length,
          maxPlayers: finalRoom.maxPlayers
        };
        
        player.ws.send(JSON.stringify(advancementMessage));
        console.log(`🏆 Sent tournament advancement details to ${player.username}`);
      } catch (e) {
        console.error(`🏆 Failed to send advancement message to ${player.username}:`, e);
      }
    }
    
    // Check if final room is ready to start (2 players)
    if (finalRoom.players.length === 2) {
      console.log(`🏆 Final room ${finalRoom.id} (tournament ${finalRoom.metadata.tournamentId}) is full! Ready to start final game...`);
      
      // Update both players with opponent information
      this._updateFinalRoomPlayersWithOpponent(finalRoom);
      
      // Mark both players as ready and start the game
      finalRoom.players.forEach(p => {
        p.readyToPlay = true;
      });
      
      // ⭐ TOURNAMENT FIX: Ensure clean state for final room
      finalRoom.ready = false;
      finalRoom.gameStarted = false;
      finalRoom.isGameOver = false;
      finalRoom.ball = null; // Reset ball for clean start
      
      console.log(`🏆 Final room ${finalRoom.id} (tournament ${finalRoom.metadata.tournamentId}) reset for clean start`);
      
      // Trigger game initialization with safety checks
      const tournamentId = finalRoom.metadata.tournamentId;
      const roomId = finalRoom.id;
      
      setTimeout(() => {
        // Safety check: Ensure room still exists and hasn't been corrupted
        const roomCheck = this.roomManager.getRoom(roomId);
        if (roomCheck && roomCheck.metadata.tournamentId === tournamentId) {
          console.log(`🏆 Initializing final game for tournament ${tournamentId}, room ${roomId}`);
          gameEngine.checkRoomReady(roomId);
        } else {
          console.error(`🏆 Cannot initialize final game: room ${roomId} (tournament ${tournamentId}) no longer exists or has been corrupted`);
        }
      }, 1000); // Small delay to ensure WebSocket messages are processed
    }
  }

  /**
   * Update players in final room when both are present (opponent information)
   * @param {Object} finalRoom - The final room with 2 players
   */
  _updateFinalRoomPlayersWithOpponent(finalRoom) {
    if (finalRoom.players.length !== 2) return;
    
    console.log(`🏆 Updating final room ${finalRoom.id} players with opponent information...`);
    
    // ⭐ TOURNAMENT FIX: Send position sync to both players for clean start
    const playerPositions = {};
    finalRoom.players.forEach(player => {
      playerPositions[player.id] = player.positionZ; // Should be 0 for both
    });
    
    finalRoom.players.forEach((player, index) => {
      const opponent = finalRoom.players[1 - index];
      
      if (player.ws && player.ws.readyState === 1) {
        try {
          // Send position sync for both players
          const syncMessage = {
            type: 'sync',
            playerPositions: playerPositions
          };
          player.ws.send(JSON.stringify(syncMessage));
          
          // Send updated waiting message with opponent information
          const waitingMessage = {
            type: 'waitingForPlayers',
            readyCount: 2,
            totalNeeded: 2,
            currentPlayerName: player.username || 'Anonymous',
            opponentName: opponent.username || 'Opponent',
            playerId: player.id,
            role: index,
            isTournament: true,
            tournamentPlayerCount: 2,
            tournamentAdvancement: {
              status: 'final_ready',
              message: `Your opponent has arrived! Final match starting soon...`,
              finalRoomType: finalRoom.metadata.finalMatch
            }
          };
          
          player.ws.send(JSON.stringify(waitingMessage));
          console.log(`🏆 Updated ${player.username} with opponent ${opponent.username} and synced positions in final room`);
        } catch (e) {
          console.error(`🏆 Failed to update player ${player.username} with opponent info:`, e);
        }
      }
    });
  }

  /**
   * Get tournament room statistics
   * @returns {Object} - Tournament room stats
   */
  getTournamentStats() {
    const allRooms = this.roomManager.getAllRooms();
    const tournamentRooms = allRooms.filter(room => this.isTournamentRoom(room));
    const semiFinalRooms = tournamentRooms.filter(room => this.isSemiFinalRoom(room));
    const finalRooms = tournamentRooms.filter(room => this.isFinalRoom(room));
    const waitingRooms = tournamentRooms.filter(room => 
      !this.isSemiFinalRoom(room) && !this.isFinalRoom(room)
    );
    
    const stats = {
      totalTournamentRooms: tournamentRooms.length,
      waitingRooms: waitingRooms.length,
      semiFinalRooms: semiFinalRooms.length,
      finalRooms: finalRooms.length,
      activeTournamentRooms: tournamentRooms.filter(room => !room.isGameOver).length,
      tournamentPlayersWaiting: 0,
      fullWaitingRooms: 0,
      activeSemiFinals: semiFinalRooms.filter(room => !room.isGameOver).length,
      activeFinals: finalRooms.filter(room => !room.isGameOver).length,
      emptyFinalRooms: finalRooms.filter(room => room.players.length === 0).length
    };
    
    waitingRooms.forEach(room => {
      if (room.players.length === 4) {
        stats.fullWaitingRooms++;
      } else {
        stats.tournamentPlayersWaiting += room.players.length;
      }
    });
    
    return stats;
  }
}

// Create singleton instance
export const tournamentManager = new TournamentManager(); 