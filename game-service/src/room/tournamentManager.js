import { roomManager } from './RoomManager.js';
import { gameEngine } from '../game/GameEngine.js';

/**
 * Handles tournament-specific room management and matchmaking
 * 
 * ⭐ RACE CONDITION FIX:
 * - Final game initialization is coordinated with semi-final splash screen timing
 * - Only starts final games when BOTH semi-finals complete (6000ms delay for splash screens)
 * - Prevents visual conflicts between semi-final results and next opponent screens
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
        
        // ⭐ TOURNAMENT POWERUP FIX: Update ConnectionManager metadata to keep it in sync
        // Note: ConnectionManager metadata will be updated when the player sends their next message
        // The WebSocketHandler now uses ws.roomId dynamically, so this should work automatically
        
        console.log(`🏆 Player ${player.id} (${player.username}) moved to Semi-Final A: ${roomAId}`);
      }
    });
    
    // Update players 2 and 3 to room B
    [players[2], players[3]].forEach((player, index) => {
      if (player.ws) {
        player.ws.roomId = roomBId;
        player.roomId = roomBId;
        
        // ⭐ TOURNAMENT POWERUP FIX: Update ConnectionManager metadata to keep it in sync
        // Note: ConnectionManager metadata will be updated when the player sends their next message
        // The WebSocketHandler now uses ws.roomId dynamically, so this should work automatically
        
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
    const tournamentId = semiFinalRoom.metadata.tournamentId;

    // Check if other semi-final is empty
    const otherSemiFinalEmpty = this._isOtherSemiFinalEmpty(semiFinalRoomId, tournamentId);
    
    if (otherSemiFinalEmpty) {
        console.log(`🏆 Other semi-final is empty! Awarding 1st and 2nd place directly`);
        
        // Find the actual player objects
        const winnerPlayer = semiFinalRoom.players.find(p => p.id === winner.id);
        const loserPlayer = semiFinalRoom.players.find(p => p.id === loser.id);
        
        if (!winnerPlayer || !loserPlayer) {
            console.error(`🏆 Cannot find winner or loser player objects in room ${semiFinalRoomId}`);
            return;
        }

        // Send direct final placement messages
        this._sendDirectFinalPlacement(winnerPlayer, loserPlayer, matchData, semiFinalRoomId);
        
        // Clean up the semi-final room
        semiFinalRoom.players = [];
        semiFinalRoom.metadata.status = 'completed_with_direct_placement';
        
        // Clean up final rooms since they won't be used
        const finalRoomAId = semiFinalRoom.metadata.finalRoomA;
        const finalRoomBId = semiFinalRoom.metadata.finalRoomB;
        if (finalRoomAId) this.roomManager.removeRoom(finalRoomAId);
        if (finalRoomBId) this.roomManager.removeRoom(finalRoomBId);
        
        // Clean up the players' connections
        if (winnerPlayer.ws) winnerPlayer.ws.close();
        if (loserPlayer.ws) loserPlayer.ws.close();
        
        console.log(`🏆 Tournament completed with direct placement: Winner ${winner.username} (1st), Loser ${loser.username} (2nd)`);
        return;
    }

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

    // ⭐ RACE CONDITION FIX: Check if this was the last semi-final to complete
    // If both final rooms are now full (2 players each), this was the last semi-final
    const bothFinalRoomsFull = finalRoomA.players.length === 2 && finalRoomB.players.length === 2;
    
    if (bothFinalRoomsFull) {
      console.log('🏆 LAST semi-final completed - coordinating with splash screen timing');
      console.log(`🏆 Both final rooms are full: ${finalRoomAId} (${finalRoomA.players.length}/2), ${finalRoomBId} (${finalRoomB.players.length}/2)`);
      
      // Update players in both final rooms with opponent information
      this._updateFinalRoomPlayersWithOpponent(finalRoomA);
      this._updateFinalRoomPlayersWithOpponent(finalRoomB);
      
      // Mark all players as ready for finals
      finalRoomA.players.forEach(p => { p.readyToPlay = true; });
      finalRoomB.players.forEach(p => { p.readyToPlay = true; });
      
      // Reset final room states for clean start
      [finalRoomA, finalRoomB].forEach(room => {
        room.ready = false;
        room.gameStarted = false;
        room.isGameOver = false;
        room.ball = null;
      });
      
      console.log(`🏆 Final rooms ${finalRoomAId} and ${finalRoomBId} reset for clean start`);
      
      // ⭐ TIMING COORDINATION: Wait for semi-final splash screens to complete
      // Semi-final splash duration is 5000ms, so wait 6000ms (5000ms + 1000ms buffer)
      setTimeout(() => {
        // Safety check: Ensure rooms still exist and haven't been corrupted
        const roomACheck = this.roomManager.getRoom(finalRoomAId);
        const roomBCheck = this.roomManager.getRoom(finalRoomBId);
        
        if (roomACheck && roomBCheck && 
            roomACheck.metadata.tournamentId === tournamentId && 
            roomBCheck.metadata.tournamentId === tournamentId) {
          
          console.log(`🏆 Initializing final games for tournament ${tournamentId} after splash screen coordination`);
          console.log(`🏆 Starting Winners Final: ${finalRoomAId}`);
          console.log(`🏆 Starting Losers Final (3rd place): ${finalRoomBId}`);
          
          // Start both final games simultaneously
          gameEngine.checkRoomReady(finalRoomAId);
          gameEngine.checkRoomReady(finalRoomBId);
          
        } else {
          console.error(`🏆 Cannot initialize final games: rooms ${finalRoomAId} or ${finalRoomBId} (tournament ${tournamentId}) no longer exist or have been corrupted`);
        }
      }, 6000); // 5000ms semi-final splash + 1000ms buffer
      
    } else {
      console.log('🏆 FIRST semi-final completed - waiting for second semi-final to complete');
      console.log(`🏆 Final room states: ${finalRoomAId} (${finalRoomA.players.length}/2), ${finalRoomBId} (${finalRoomB.players.length}/2)`);
      // Don't start final games yet - wait for the second semi-final to complete
    }
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
    
    // ⭐ RACE CONDITION FIX: Removed immediate final game start logic
    // Final game initialization is now handled in handleSemiFinalCompletion()
    // to coordinate timing with semi-final splash screens
    console.log(`🏆 Player ${player.username} transferred to ${finalRoom.id} (${finalRoom.players.length}/2 players)`);
    console.log(`🏆 Final game initialization will be handled by handleSemiFinalCompletion() when both semi-finals complete`);
    
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

  /**
   * Handle final match completion
   * @param {string} finalRoomId - The ID of the final room that completed
   * @param {Object} matchData - Match result data
   */
  handleFinalCompletion(finalRoomId, matchData) {
    console.log(`🏆 FINAL COMPLETION: Handling final match completion for room ${finalRoomId}`);
    
    try {
      const finalRoom = this.roomManager.getRoom(finalRoomId);
      if (!finalRoom) {
        console.error(`🏆 Final room ${finalRoomId} not found`);
        return;
      }
      
      console.log(`🏆 Final match completed in ${finalRoom.id}`);
      console.log(`🏆 Winner: ${matchData.winner.username} (${matchData.winner.score})`);
      console.log(`🏆 Loser: ${matchData.loser.username} (${matchData.loser.score})`);
      
      // Determine final type and placements
      const isWinnersFinal = finalRoom.metadata?.finalMatch === 'winners'; // 1st/2nd place
      const isLosersFinal = finalRoom.metadata?.finalMatch === 'losers'; // 3rd/4th place
      
      console.log(`🏆 Final type - Winners: ${isWinnersFinal}, Losers: ${isLosersFinal}`);
      
      let winnerPlacement, loserPlacement;
      if (isWinnersFinal) {
        winnerPlacement = 1; // Champion
        loserPlacement = 2; // Runner-up
      } else if (isLosersFinal) {
        winnerPlacement = 3; // Third place
        loserPlacement = 4; // Fourth place
      } else {
        console.warn(`🏆 Unknown final type, defaulting to winners final`);
        winnerPlacement = 1;
        loserPlacement = 2;
      }
      
      console.log(`🏆 Final placements determined - Winner: ${winnerPlacement}, Loser: ${loserPlacement}`);
      
      // Mark the room as complete
      finalRoom.isGameOver = true;
      
      // Log tournament completion
      console.log('🏆'.repeat(50));
      console.log(`🏆 TOURNAMENT FINAL COMPLETED`);
      console.log('🏆'.repeat(50));
      console.log(`🏆 ${isWinnersFinal ? 'WINNERS' : 'LOSERS'} FINAL RESULTS:`);
      console.log(`🏆 ${winnerPlacement}${this._getPlacementSuffix(winnerPlacement)} Place: ${matchData.winner.username}`);
      console.log(`🏆 ${loserPlacement}${this._getPlacementSuffix(loserPlacement)} Place: ${matchData.loser.username}`);
      console.log(`🏆 Final Score: ${matchData.winner.score}-${matchData.loser.score}`);
      console.log('🏆'.repeat(50));
      
      // The client-side will handle final splash screens based on game end detection
      console.log(`🏆 Final completion handled for room ${finalRoomId} - clients will show placement splash screens`);
      
    } catch (error) {
      console.error(`🏆 Error handling final completion for room ${finalRoomId}:`, error);
    }
  }

  /**
   * Get placement suffix for display (1st, 2nd, 3rd, 4th)
   * @param {number} placement - The placement number
   * @returns {string} The placement suffix string
   */
  _getPlacementSuffix(placement) {
    switch (placement) {
      case 1: return 'st';
      case 2: return 'nd'; 
      case 3: return 'rd';
      default: return 'th';
    }
  }

  /**
   * Mark a semi-final room as empty (both players disconnected)
   */
  _markSemiFinalAsEmpty(semiFinalRoomId) {
    const semiFinalRoom = this.roomManager.getRoom(semiFinalRoomId);
    if (!semiFinalRoom || !this.isSemiFinalRoom(semiFinalRoom)) {
        console.error(`🏆 Cannot mark non-semi-final room ${semiFinalRoomId} as empty`);
        return;
    }

    console.log(`🏆 Marking semi-final room ${semiFinalRoomId} as empty (both players disconnected)`);
    semiFinalRoom.metadata.isEmptySemiFinal = true;
    semiFinalRoom.metadata.status = 'empty';
  }

  /**
   * Get the other semi-final room in the tournament
   * @param {string} currentSemiFinalRoomId - The current semi-final room ID
   * @param {string} tournamentId - The tournament ID
   * @returns {Object|null} - The other semi-final room, or null if not found
   */
  _getOtherSemiFinalRoom(currentSemiFinalRoomId, tournamentId) {
    // Get all rooms through the room manager's getAllRooms method
    const allRooms = this.roomManager.getAllRooms();
    
    // Filter to find semi-final rooms for this tournament
    const semiFinalRooms = allRooms.filter(room => 
      room.metadata?.tournamentId === tournamentId && 
      this.isSemiFinalRoom(room) &&
      room.id !== currentSemiFinalRoomId
    );

    // There should be exactly one other semi-final room
    if (semiFinalRooms.length === 1) {
      return semiFinalRooms[0];
    }

    console.log(`🏆 Could not find other semi-final room for ${currentSemiFinalRoomId} in tournament ${tournamentId}`);
    console.log(`🏆 Found ${semiFinalRooms.length} other semi-final rooms`);
    return null;
  }

  /**
   * Check if the other semi-final room is empty
   * @param {string} currentSemiFinalRoomId - The current semi-final room ID
   * @param {string} tournamentId - The tournament ID
   * @returns {boolean} - True if the other semi-final is empty or marked as empty
   */
  _isOtherSemiFinalEmpty(currentSemiFinalRoomId, tournamentId) {
    const otherSemiFinal = this._getOtherSemiFinalRoom(currentSemiFinalRoomId, tournamentId);
    
    if (!otherSemiFinal) {
      // If we can't find the other semi-final, it might have been cleaned up after being empty
      return true;
    }

    // Check if the room is marked as empty or has no players
    const isEmpty = otherSemiFinal.metadata?.isEmptySemiFinal === true || 
                   otherSemiFinal.metadata?.status === 'empty' ||
                   otherSemiFinal.players.length === 0;

    if (isEmpty) {
      console.log(`🏆 Other semi-final ${otherSemiFinal.id} is empty`);
    }

    return isEmpty;
  }

  /**
   * Send direct final placement messages to players
   */
  _sendDirectFinalPlacement(winnerPlayer, loserPlayer, matchData, semiFinalRoomId) {
    try {
        // Send to winner (1st place)
        if (winnerPlayer.ws && winnerPlayer.ws.readyState === 1) {
            winnerPlayer.ws.send(JSON.stringify({
                type: 'gameEnd',
                ...matchData,
                tournamentAdvancement: {
                    stage: 'final',
                    result: 'direct_first_place',
                    message: 'Congratulations! You win the tournament!',
                    finalPlacement: 1
                }
            }));
        }

        // Send to loser (2nd place)
        if (loserPlayer.ws && loserPlayer.ws.readyState === 1) {
            loserPlayer.ws.send(JSON.stringify({
                type: 'gameEnd',
                ...matchData,
                tournamentAdvancement: {
                    stage: 'final',
                    result: 'direct_second_place',
                    message: 'Well played! You finish in second place!',
                    finalPlacement: 2
                }
            }));
        }

        console.log(`🏆 Sent direct final placement messages to players in room ${semiFinalRoomId}`);
    } catch (error) {
        console.error(`🏆 Error sending direct final placement messages:`, error);
    }
  }
}

// Create singleton instance
export const tournamentManager = new TournamentManager(); 