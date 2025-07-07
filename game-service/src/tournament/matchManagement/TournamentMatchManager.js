/**
 * Tournament Match Manager
 * Handles tournament match lifecycle and progression
 */

import { gameStateManager } from '../../game/GameStateManager.js';

/**
 * Tournament Match Manager
 */
export class TournamentMatchManager {
  constructor(tournamentManager) {
    this.tournamentManager = tournamentManager;
  }

  /**
   * Start the semi-final matches with splash screens
   */
  startSemiFinalMatches(waitingRoomId) {
    // Starting semi-final matches for tournament
    
    const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) {
      console.error(`Waiting room data not found for starting matches`);
      return;
    }
    
    const semiFinalA = waitingRoomData.tournamentRooms.semiFinalA;
    const semiFinalB = waitingRoomData.tournamentRooms.semiFinalB;
    
    // Start Semi-Final A
    if (semiFinalA.players.length === 2) {
      const player0 = semiFinalA.players[0];
      const player1 = semiFinalA.players[1];
      
      // Starting Semi-Final A
      
      // ⭐ FIX: Update server-side roles to match client-side roles
      console.log(`🏆 SEMI-FINAL A - Before role update - Player0 role: ${player0.role}, Player1 role: ${player1.role}`);
      player0.assignToRoom(semiFinalA.id, 0); // Player0 gets role 0
      player1.assignToRoom(semiFinalA.id, 1); // Player1 gets role 1
      console.log(`🏆 SEMI-FINAL A - After role update - Player0 role: ${player0.role}, Player1 role: ${player1.role}`);
      
      // Send game initialization to both players
      [player0, player1].forEach((player, index) => {
        if (player.ws && player.ws.readyState === 1) {
          const gameInitData = {
            type: 'gameInit',
            roomId: semiFinalA.id,
            playerId: player.id,
            opponentId: index === 0 ? player1.id : player0.id,
            playerName: player.username,
            opponentName: index === 0 ? player1.username : player0.username,
            role: index, // 0 for player0, 1 for player1
            matchType: 'tournament_semi_final',
            // ⭐ FIX: Include initial paddle positions to ensure synchronization
            playerPositionZ: player.positionZ || 0,
            opponentPositionZ: index === 0 ? player1.positionZ || 0 : player0.positionZ || 0
          };
          
          try {
            player.ws.send(JSON.stringify(gameInitData));
            console.log(`🏆 Sent game init to ${player.username}(${player.id}) in Semi-Final A`);
          } catch (error) {
            console.error(`Failed to send game init to ${player.username}:`, error);
          }
        } else {
          console.error(`🏆 Player ${player.username}(${player.id}) not ready for game init in Semi-Final A`);
        }
      });
    }
    
    // Start Semi-Final B
    if (semiFinalB.players.length === 2) {
      const player2 = semiFinalB.players[0];
      const player3 = semiFinalB.players[1];
      
      // Starting Semi-Final B
      
      // ⭐ FIX: Update server-side roles to match client-side roles
      console.log(`🏆 SEMI-FINAL B - Before role update - Player2 role: ${player2.role}, Player3 role: ${player3.role}`);
      player2.assignToRoom(semiFinalB.id, 0); // Player2 gets role 0
      player3.assignToRoom(semiFinalB.id, 1); // Player3 gets role 1
      console.log(`🏆 SEMI-FINAL B - After role update - Player2 role: ${player2.role}, Player3 role: ${player3.role}`);
      
      // Send game initialization to both players
      [player2, player3].forEach((player, index) => {
        if (player.ws && player.ws.readyState === 1) {
          const gameInitData = {
            type: 'gameInit',
            roomId: semiFinalB.id,
            playerId: player.id,
            opponentId: index === 0 ? player3.id : player2.id,
            playerName: player.username,
            opponentName: index === 0 ? player3.username : player2.username,
            role: index, // 0 for player2, 1 for player3
            matchType: 'tournament_semi_final',
            // ⭐ FIX: Include initial paddle positions to ensure synchronization
            playerPositionZ: player.positionZ || 0,
            opponentPositionZ: index === 0 ? player3.positionZ || 0 : player2.positionZ || 0
          };
          
          try {
            player.ws.send(JSON.stringify(gameInitData));
            console.log(`🏆 Sent game init to ${player.username}(${player.id}) in Semi-Final B`);
          } catch (error) {
            console.error(`Failed to send game init to ${player.username}:`, error);
          }
        } else {
          console.error(`🏆 Player ${player.username}(${player.id}) not ready for game init in Semi-Final B`);
        }
      });
    }
  }

  /**
   * Handle semi-final match end and advance players to finals
   */
  async handleSemiFinalMatchEnd(waitingRoomId, roomId, matchData) {
    console.log(`🏆 Semi-final match ended in room ${roomId}, advancing players to finals`);
    
    const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) {
      console.error(`🏆 Waiting room data not found for tournament ${waitingRoomId}`);
      return;
    }
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.error(`🏆 Tournament room ${roomId} not found`);
      return;
    }
    
    const winner = matchData.winner;
    const loser = matchData.loser;
    
    // Store the match result
    if (!waitingRoomData.semiFinalResults) {
      waitingRoomData.semiFinalResults = {};
    }
    waitingRoomData.semiFinalResults[roomId] = { winner, loser };
    
    // Transfer players to their respective final rooms
    await this.tournamentManager.transferManager._transferPlayersToFinals(waitingRoomId, roomId, winner, loser);
    
    // Check if both semi-finals are complete and start finals
    await this._checkFinalsReadiness(waitingRoomId);
  }

  /**
   * Handle final match end and complete tournament
   */
  async handleFinalMatchEnd(waitingRoomId, roomId, matchData) {
    console.log(`🏆 Final match ended in room ${roomId}`);
    
    const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) {
      console.error(`🏆 Waiting room data not found for tournament ${waitingRoomId}`);
      return;
    }
    
    const winner = matchData.winner;
    const loser = matchData.loser;
    const roomType = gameStateManager.getRoom(roomId)?.metadata?.roomType;
    
    // Store the final result
    if (!waitingRoomData.finalResults) {
      waitingRoomData.finalResults = {};
    }
    waitingRoomData.finalResults[roomType] = { winner, loser };
    
    // Send individual final match completion message to players in this room
    this.tournamentManager.communicationManager._sendIndividualFinalMatchCompletion(waitingRoomId, roomId, roomType, winner, loser);
    
    // Check if both finals are complete
    const winnerFinalResult = waitingRoomData.finalResults['winner_final'];
    const loserFinalResult = waitingRoomData.finalResults['loser_final'];
    
    if (winnerFinalResult && loserFinalResult) {
      console.log(`🏆 Both finals complete, ending tournament`);
      
      // Send tournament completion message to all players
      this.tournamentManager.communicationManager._sendTournamentCompletionMessage(waitingRoomId, matchData);
      
      // Mark tournament as finished
      waitingRoomData.phase = 'FINISHED';
      
      // Schedule cleanup
      setTimeout(() => {
        this.tournamentManager.cleanupManager.cleanupWaitingRoom(waitingRoomId);
      }, 10000); // 10 seconds delay to allow players to see results
    } else {
      console.log(`🏆 Waiting for other final to complete. Winner final: ${!!winnerFinalResult}, Loser final: ${!!loserFinalResult}`);
    }
  }

  /**
   * Check if both finals are ready and start them
   */
  async _checkFinalsReadiness(waitingRoomId) {
    const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) return;
    
    // Check if both semi-finals are complete
    const semiFinalA = waitingRoomData.tournamentRooms.semiFinalA;
    const semiFinalB = waitingRoomData.tournamentRooms.semiFinalB;
    
    const semiFinalAResult = waitingRoomData.semiFinalResults?.[semiFinalA.id];
    const semiFinalBResult = waitingRoomData.semiFinalResults?.[semiFinalB.id];
    
    if (!semiFinalAResult || !semiFinalBResult) {
      console.log(`🏆 Waiting for both semi-finals to complete...`);
      return;
    }
    
    console.log(`🏆 Both semi-finals complete, starting finals`);
    
    // Start winner final
    await this._startWinnerFinal(waitingRoomId, semiFinalAResult, semiFinalBResult);
    
    // Start loser final
    await this._startLoserFinal(waitingRoomId, semiFinalAResult, semiFinalBResult);
  }

  /**
   * Start the winner final match
   */
  async _startWinnerFinal(waitingRoomId, semiFinalAResult, semiFinalBResult) {
    const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) return;
    
    const winnerFinal = waitingRoomData.tournamentRooms.winnerFinal;
    const winnerA = semiFinalAResult.winner;
    const winnerB = semiFinalBResult.winner;
    
    console.log(`🏆 Starting winner final: ${winnerA.username} vs ${winnerB.username}`);
    console.log(`🏆 Winner final room players: [${winnerFinal.players.map(p => `${p.username}(${p.id})`).join(', ')}]`);
    
    // ⭐ FIX: Use room order to determine players and roles
    if (winnerFinal.players.length !== 2) {
      console.error(`🏆 Winner final room must have exactly 2 players, found ${winnerFinal.players.length}`);
      return;
    }
    
    const player0 = winnerFinal.players[0]; // First player in room gets role 0
    const player1 = winnerFinal.players[1]; // Second player in room gets role 1
    
    console.log(`🏆 Using room order - Player0: ${player0.username}(${player0.id}), Player1: ${player1.username}(${player1.id})`);
    
    // ⭐ FIX: Reset both players for clean start
    player0.resetForNewGame();
    player1.resetForNewGame();
    
    // ⭐ FIX: Update server-side roles to match room order
    player0.assignToRoom(winnerFinal.id, 0); // First player gets role 0
    player1.assignToRoom(winnerFinal.id, 1); // Second player gets role 1
    
    // Send game initialization to both players
    [player0, player1].forEach((player, index) => {
      if (player.ws && player.ws.readyState === 1) {
                  const gameInitData = {
            type: 'gameInit',
            roomId: winnerFinal.id,
            playerId: player.id,
            opponentId: index === 0 ? player1.id : player0.id,
            playerName: player.username,
            opponentName: index === 0 ? player1.username : player0.username,
            role: index, // 0 for player0, 1 for player1
            matchType: 'tournament_winner_final',
            // ⭐ FIX: Include initial paddle positions to ensure synchronization
            playerPositionZ: player.positionZ || 0,
            opponentPositionZ: index === 0 ? player1.positionZ || 0 : player0.positionZ || 0
          };
        
        console.log(`🏆 WINNER FINAL - Sending gameInit to ${player.username}: playerPositionZ=${gameInitData.playerPositionZ}, opponentPositionZ=${gameInitData.opponentPositionZ}`);
        
        try {
          player.ws.send(JSON.stringify(gameInitData));
          console.log(`🏆 Sent winner final init to ${player.username}(${player.id})`);
        } catch (error) {
          console.error(`Failed to send winner final init to ${player.username}:`, error);
        }
      }
    });
  }

  /**
   * Start the loser final match
   */
  async _startLoserFinal(waitingRoomId, semiFinalAResult, semiFinalBResult) {
    const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) return;
    
    const loserFinal = waitingRoomData.tournamentRooms.loserFinal;
    const loserA = semiFinalAResult.loser;
    const loserB = semiFinalBResult.loser;
    
    console.log(`🏆 Starting loser final: ${loserA.username} vs ${loserB.username}`);
    console.log(`🏆 Loser final room players: [${loserFinal.players.map(p => `${p.username}(${p.id})`).join(', ')}]`);
    
    // ⭐ FIX: Use room order to determine players and roles
    if (loserFinal.players.length !== 2) {
      console.error(`🏆 Loser final room must have exactly 2 players, found ${loserFinal.players.length}`);
      return;
    }
    
    const player0 = loserFinal.players[0]; // First player in room gets role 0
    const player1 = loserFinal.players[1]; // Second player in room gets role 1
    
    console.log(`🏆 Using room order - Player0: ${player0.username}(${player0.id}), Player1: ${player1.username}(${player1.id})`);
    
    // ⭐ FIX: Reset both players for clean start
    console.log(`🏆 LOSER FINAL - Before reset - Player0 positionZ: ${player0.positionZ}, Player1 positionZ: ${player1.positionZ}`);
    player0.resetForNewGame();
    player1.resetForNewGame();
    console.log(`🏆 LOSER FINAL - After reset - Player0 positionZ: ${player0.positionZ}, Player1 positionZ: ${player1.positionZ}`);
    
    // ⭐ FIX: Update server-side roles to match room order
    console.log(`🏆 LOSER FINAL - Before role update - Player0 role: ${player0.role}, Player1 role: ${player1.role}`);
    player0.assignToRoom(loserFinal.id, 0); // First player gets role 0
    player1.assignToRoom(loserFinal.id, 1); // Second player gets role 1
    console.log(`🏆 LOSER FINAL - After role update - Player0 role: ${player0.role}, Player1 role: ${player1.role}`);
    
    // Send game initialization to both players
    [player0, player1].forEach((player, index) => {
      if (player.ws && player.ws.readyState === 1) {
                  const gameInitData = {
            type: 'gameInit',
            roomId: loserFinal.id,
            playerId: player.id,
            opponentId: index === 0 ? player1.id : player0.id,
            playerName: player.username,
            opponentName: index === 0 ? player1.username : player0.username,
            role: index, // 0 for player0, 1 for player1
            matchType: 'tournament_loser_final',
            // ⭐ FIX: Include initial paddle positions to ensure synchronization
            playerPositionZ: player.positionZ || 0,
            opponentPositionZ: index === 0 ? player1.positionZ || 0 : player0.positionZ || 0
          };
        
        console.log(`🏆 LOSER FINAL - Sending gameInit to ${player.username}: playerPositionZ=${gameInitData.playerPositionZ}, opponentPositionZ=${gameInitData.opponentPositionZ}`);
        
        try {
          player.ws.send(JSON.stringify(gameInitData));
          console.log(`🏆 Sent loser final init to ${player.username}(${player.id})`);
        } catch (error) {
          console.error(`Failed to send loser final init to ${player.username}:`, error);
        }
      }
    });
  }
} 