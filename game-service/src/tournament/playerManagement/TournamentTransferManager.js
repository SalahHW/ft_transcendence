/**
 * Tournament Transfer Manager
 * Handles player transfers between tournament phases
 */

import { gameStateManager } from '../../game/GameStateManager.js';
import { transferLockManager, TransferOperations } from './TournamentTransferLockManager.js';

/**
 * Tournament Transfer Manager
 */
export class TournamentTransferManager {
  constructor(tournamentManager) {
    this.tournamentManager = tournamentManager;
  }

  /**
   * Transfer players' WebSocket connections to their semi-final rooms
   */
  async transferPlayersToSemiFinals(waitingRoomId, players) {
    console.log(`🏆 Starting semi-final transfer for tournament ${waitingRoomId}`);
    
    // Acquire transfer lock
    const lockAcquired = await transferLockManager.acquireLock(
      waitingRoomId, 
      TransferOperations.WAITING_TO_SEMI_FINAL,
      { playerCount: players.length }
    );
    
    if (!lockAcquired) {
      console.log(`🏆 Transfer queued for tournament ${waitingRoomId}`);
      return; // Transfer will be processed when lock becomes available
    }
    
    try {
      // Transferring WebSocket connections to semi-final rooms
      const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
      if (!waitingRoomData) {
        console.error(`Waiting room data not found for transfer`);
        transferLockManager.releaseLock(waitingRoomId, false);
        return;
      }
      
      // Transfer players to Semi-Final A
      const semiFinalA = waitingRoomData.tournamentRooms.semiFinalA;
      const player0 = players[0];
      const player1 = players[1];
      
      // Transfer player 0 to Semi-Final A
      if (player0.ws && player0.ws.readyState === 1) {
        this.tournamentManager.broadcastManager.broadcastMatchAssignment(
          player0.id, 
          semiFinalA.id, 
          player1.id, 
          player1.username, 
          'tournament_semi_final'
        );
        
        // Update player's room assignment
        player0.assignToRoom(semiFinalA.id, 0);
        player0.ws.roomId = semiFinalA.id;
      }
      
      // Transfer player 1 to Semi-Final A
      if (player1.ws && player1.ws.readyState === 1) {
        this.tournamentManager.broadcastManager.broadcastMatchAssignment(
          player1.id, 
          semiFinalA.id, 
          player0.id, 
          player0.username, 
          'tournament_semi_final'
        );
        
        // Update player's room assignment
        player1.assignToRoom(semiFinalA.id, 1);
        player1.ws.roomId = semiFinalA.id;
      }
      
      // Transfer players to Semi-Final B
      const semiFinalB = waitingRoomData.tournamentRooms.semiFinalB;
      const player2 = players[2];
      const player3 = players[3];
      
      // Transfer player 2 to Semi-Final B
      if (player2.ws && player2.ws.readyState === 1) {
        this.tournamentManager.broadcastManager.broadcastMatchAssignment(
          player2.id, 
          semiFinalB.id, 
          player3.id, 
          player3.username, 
          'tournament_semi_final'
        );
        
        // Update player's room assignment
        player2.assignToRoom(semiFinalB.id, 0);
        player2.ws.roomId = semiFinalB.id;
        console.log(`🏆 Transferred ${player2.username}(${player2.id}) to room ${semiFinalB.id}, ws.roomId: ${player2.ws.roomId}`);
      } else {
        console.error(`🏆 Player ${player2.username}(${player2.id}) not ready for transfer to Semi-Final B`);
      }
      
      // Transfer player 3 to Semi-Final B
      if (player3.ws && player3.ws.readyState === 1) {
        this.tournamentManager.broadcastManager.broadcastMatchAssignment(
          player3.id, 
          semiFinalB.id, 
          player2.id, 
          player2.username, 
          'tournament_semi_final'
        );
        
        // Update player's room assignment
        player3.assignToRoom(semiFinalB.id, 1);
        player3.ws.roomId = semiFinalB.id;
        console.log(`🏆 Transferred ${player3.username}(${player3.id}) to room ${semiFinalB.id}, ws.roomId: ${player3.ws.roomId}`);
      } else {
        console.error(`🏆 Player ${player3.username}(${player3.id}) not ready for transfer to Semi-Final B`);
      }
      
      // Clear animation status for both semi-final rooms to ensure clean state
      gameStateManager.clearAnimationStatus(semiFinalA.id);
      gameStateManager.clearAnimationStatus(semiFinalB.id);
      
      // Verify transfer completion
      const transferSuccess = await transferLockManager.verifyTransfer(waitingRoomId, async () => {
        // Check if all players are in their correct rooms
        const roomA = gameStateManager.getRoom(semiFinalA.id);
        const roomB = gameStateManager.getRoom(semiFinalB.id);
        
        const playersInRoomA = roomA ? roomA.players.filter(p => p.ws && p.ws.readyState === 1) : [];
        const playersInRoomB = roomB ? roomB.players.filter(p => p.ws && p.ws.readyState === 1) : [];
        
        console.log(`🔍 Transfer verification: Room A has ${playersInRoomA.length}/2 players, Room B has ${playersInRoomB.length}/2 players`);
        
        return playersInRoomA.length === 2 && playersInRoomB.length === 2;
      });
      
      if (transferSuccess) {
        console.log(`🏆 Semi-final transfer completed successfully for tournament ${waitingRoomId}`);
        transferLockManager.releaseLock(waitingRoomId, true);
        
        // Wait a moment for transfers to complete, then check readiness
        setTimeout(() => {
          this.checkSemiFinalReadiness(waitingRoomId);
        }, 1000);
      } else {
        console.error(`🏆 Semi-final transfer verification failed for tournament ${waitingRoomId}`);
        transferLockManager.releaseLock(waitingRoomId, false);
      }
      
    } catch (error) {
      console.error(`🏆 Error during semi-final transfer for tournament ${waitingRoomId}:`, error);
      transferLockManager.releaseLock(waitingRoomId, false);
    }
  }

  /**
   * Check if all players are ready in their semi-final rooms
   */
  checkSemiFinalReadiness(waitingRoomId) {
    console.log(`🏆 Checking semi-final readiness for tournament ${waitingRoomId}`);
    
    const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) {
      console.error(`Waiting room data not found for readiness check`);
      return;
    }
    
    const semiFinalA = waitingRoomData.tournamentRooms.semiFinalA;
    const semiFinalB = waitingRoomData.tournamentRooms.semiFinalB;
    
    // Check if both semi-final rooms are ready
    const roomAReady = semiFinalA.players.length === 2 && 
                      semiFinalA.players.every(p => p.ws && p.ws.readyState === 1);
    const roomBReady = semiFinalB.players.length === 2 && 
                      semiFinalB.players.every(p => p.ws && p.ws.readyState === 1);
    
    console.log(`🏆 Room readiness check:`);
    console.log(`  Semi-Final A: ${semiFinalA.players.length}/2 players, ready: ${roomAReady}`);
    console.log(`  Semi-Final B: ${semiFinalB.players.length}/2 players, ready: ${roomBReady}`);
    console.log(`  Semi-Final A players: [${semiFinalA.players.map(p => `${p.username}(${p.id})`).join(', ')}]`);
    console.log(`  Semi-Final B players: [${semiFinalB.players.map(p => `${p.username}(${p.id})`).join(', ')}]`);
    
    if (roomAReady && roomBReady) {
      console.log(`🏆 All semi-final rooms ready, starting matches`);
      this.tournamentManager.matchManager.startSemiFinalMatches(waitingRoomId);
    } else {
      console.log(`🏆 Semi-final rooms not ready yet. A: ${roomAReady}, B: ${roomBReady}`);
      // Retry after a delay
      setTimeout(() => {
        this.checkSemiFinalReadiness(waitingRoomId);
      }, 2000);
    }
  }

  /**
   * Transfer players to their respective final rooms
   */
  async _transferPlayersToFinals(waitingRoomId, semiFinalRoomId, winner, loser) {
    console.log(`🏆 Starting final transfer for tournament ${waitingRoomId}, room ${semiFinalRoomId}`);
    
    // Acquire transfer lock
    const lockAcquired = await transferLockManager.acquireLock(
      waitingRoomId, 
      TransferOperations.SEMI_FINAL_TO_FINAL,
      { 
        semiFinalRoomId, 
        winnerId: winner.id, 
        loserId: loser.id 
      }
    );
    
    if (!lockAcquired) {
      console.log(`🏆 Final transfer queued for tournament ${waitingRoomId}`);
      return; // Transfer will be processed when lock becomes available
    }
    
    try {
      const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
      if (!waitingRoomData) {
        console.error(`🏆 Waiting room data not found for final transfer`);
        transferLockManager.releaseLock(waitingRoomId, false);
        return;
      }
      
      const winnerFinal = waitingRoomData.tournamentRooms.winnerFinal;
      const loserFinal = waitingRoomData.tournamentRooms.loserFinal;
      
      // Find the actual player objects
      const winnerPlayer = this._findPlayerInRoom(semiFinalRoomId, winner.id);
      const loserPlayer = this._findPlayerInRoom(semiFinalRoomId, loser.id);
      
      if (!winnerPlayer || !loserPlayer) {
        console.error(`🏆 Could not find winner or loser player objects`);
        transferLockManager.releaseLock(waitingRoomId, false);
        return;
      }
      
      // Transfer winner to winner final
      if (winnerPlayer.ws && winnerPlayer.ws.readyState === 1) {
        // Remove player from semi-final room
        const semiFinalRoom = gameStateManager.getRoom(semiFinalRoomId);
        if (semiFinalRoom) {
          semiFinalRoom.players = semiFinalRoom.players.filter(p => p.id !== winnerPlayer.id);
        }
        
        // ⭐ FIX: Reset player state for new game before transfer
        winnerPlayer.resetForNewGame();
        
        // Add player to winner final room
        winnerFinal.addPlayer(winnerPlayer);
        winnerPlayer.assignToRoom(winnerFinal.id, 0); // Role will be reassigned when finals start
        winnerPlayer.ws.roomId = winnerFinal.id;
        
        console.log(`🏆 Added ${winnerPlayer.username} to winner final room. Room now has ${winnerFinal.players.length} players`);
        
        // Send advancement message
        this.tournamentManager.communicationManager.sendToPlayer(winnerFinal.id, winnerPlayer.id, {
          type: 'tournamentAdvancement',
          status: 'transferred_to_final',
          finalType: 'winner',
          message: '🎉 You advanced to the Winner Final!'
        });
        
        console.log(`🏆 Transferred winner ${winnerPlayer.username} to winner final`);
      }
      
      // Transfer loser to loser final
      if (loserPlayer.ws && loserPlayer.ws.readyState === 1) {
        // Remove player from semi-final room
        const semiFinalRoom = gameStateManager.getRoom(semiFinalRoomId);
        if (semiFinalRoom) {
          semiFinalRoom.players = semiFinalRoom.players.filter(p => p.id !== loserPlayer.id);
        }
        
        // ⭐ FIX: Reset player state for new game before transfer
        loserPlayer.resetForNewGame();
        
        // Add player to loser final room
        loserFinal.addPlayer(loserPlayer);
        loserPlayer.assignToRoom(loserFinal.id, 0); // Role will be reassigned when finals start
        loserPlayer.ws.roomId = loserFinal.id;
        
        console.log(`🏆 Added ${loserPlayer.username} to loser final room. Room now has ${loserFinal.players.length} players`);
        
        // Send advancement message
        this.tournamentManager.communicationManager.sendToPlayer(loserFinal.id, loserPlayer.id, {
          type: 'tournamentAdvancement',
          status: 'transferred_to_final',
          finalType: 'loser',
          message: '🏆 You advanced to the Loser Final!'
        });
        
        console.log(`🏆 Transferred loser ${loserPlayer.username} to loser final`);
      }
      
      // Verify transfer completion
      const transferSuccess = await transferLockManager.verifyTransfer(waitingRoomId, async () => {
        // Check if players are in their correct final rooms
        const winnerFinalRoom = gameStateManager.getRoom(winnerFinal.id);
        const loserFinalRoom = gameStateManager.getRoom(loserFinal.id);
        
        const winnerInFinal = winnerFinalRoom ? winnerFinalRoom.players.some(p => p.id === winner.id) : false;
        const loserInFinal = loserFinalRoom ? loserFinalRoom.players.some(p => p.id === loser.id) : false;
        
        console.log(`🔍 Final transfer verification: Winner in final: ${winnerInFinal}, Loser in final: ${loserInFinal}`);
        
        return winnerInFinal && loserInFinal;
      });
      
      if (transferSuccess) {
        console.log(`🏆 Final transfer completed successfully for tournament ${waitingRoomId}`);
        transferLockManager.releaseLock(waitingRoomId, true);
      } else {
        console.error(`🏆 Final transfer verification failed for tournament ${waitingRoomId}`);
        transferLockManager.releaseLock(waitingRoomId, false);
      }
      
    } catch (error) {
      console.error(`🏆 Error during final transfer for tournament ${waitingRoomId}:`, error);
      transferLockManager.releaseLock(waitingRoomId, false);
    }
  }

  /**
   * Handle player connecting after tournament has started
   */
  handleLateConnectingPlayer(playerId, waitingRoomId) {
    const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) return;
    
    const waitingRoom = gameStateManager.getRoom(waitingRoomId);
    if (!waitingRoom) return;
    
    // Find the player
    const player = waitingRoom.players.find(p => p.id === playerId);
    if (!player) return;
    
    // Find which semi-final room this player should be in
    const semiFinalA = waitingRoomData.tournamentRooms.semiFinalA;
    const semiFinalB = waitingRoomData.tournamentRooms.semiFinalB;
    
    let targetRoom = null;
    let role = -1;
    
    if (semiFinalA.players.some(p => p.id === playerId)) {
      targetRoom = semiFinalA;
      role = semiFinalA.players.findIndex(p => p.id === playerId);
    } else if (semiFinalB.players.some(p => p.id === playerId)) {
      targetRoom = semiFinalB;
      role = semiFinalB.players.findIndex(p => p.id === playerId);
    }
    
    if (targetRoom && player.ws && player.ws.readyState === 1) {
      console.log(`🏆 Transferring late-connecting player ${player.username} to ${targetRoom.id}`);
      
      // Update player's room assignment
      player.assignToRoom(targetRoom.id, role);
      player.ws.roomId = targetRoom.id;
      
      // Send game initialization
      const opponent = targetRoom.players.find(p => p.id !== playerId);
      if (opponent) {
        const gameInitData = {
          type: 'gameInit',
          roomId: targetRoom.id,
          playerId: player.id,
          opponentId: opponent.id,
          playerName: player.username,
          opponentName: opponent.username,
          role: role,
          matchType: 'tournament_semi_final'
        };
        
        try {
          player.ws.send(JSON.stringify(gameInitData));
          console.log(`🏆 Sent game init to late-connecting player ${player.username}`);
        } catch (error) {
          console.error(`Failed to send game init to late-connecting player ${player.username}:`, error);
        }
      }
    }
  }

  /**
   * Find a player in a specific room
   */
  _findPlayerInRoom(roomId, playerId) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) return null;
    
    return room.players.find(p => p.id === playerId);
  }
} 