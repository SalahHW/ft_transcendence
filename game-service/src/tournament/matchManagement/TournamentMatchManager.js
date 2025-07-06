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
            matchType: 'tournament_semi_final'
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
            matchType: 'tournament_semi_final'
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
    
    // Find player objects
    const playerA = this.tournamentManager.transferManager._findPlayerInRoom(winnerFinal.id, winnerA.id);
    const playerB = this.tournamentManager.transferManager._findPlayerInRoom(winnerFinal.id, winnerB.id);
    
    console.log(`🏆 Found player A: ${playerA ? playerA.username : 'NOT FOUND'}`);
    console.log(`🏆 Found player B: ${playerB ? playerB.username : 'NOT FOUND'}`);
    
    if (!playerA || !playerB) {
      console.error(`🏆 Could not find winner final players`);
      console.error(`🏆 Looking for: ${winnerA.username}(${winnerA.id}) and ${winnerB.username}(${winnerB.id})`);
      console.error(`🏆 Available players in winner final: [${winnerFinal.players.map(p => `${p.username}(${p.id})`).join(', ')}]`);
      return;
    }
    
    // ⭐ FIX: Reset both players for clean start
    playerA.resetForNewGame();
    playerB.resetForNewGame();
    
    // Send game initialization to both players
    [playerA, playerB].forEach((player, index) => {
      if (player.ws && player.ws.readyState === 1) {
        const gameInitData = {
          type: 'gameInit',
          roomId: winnerFinal.id,
          playerId: player.id,
          opponentId: index === 0 ? playerB.id : playerA.id,
          playerName: player.username,
          opponentName: index === 0 ? playerB.username : playerA.username,
          role: index, // 0 for playerA, 1 for playerB
          matchType: 'tournament_winner_final'
        };
        
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
    
    // Find player objects
    const playerA = this.tournamentManager.transferManager._findPlayerInRoom(loserFinal.id, loserA.id);
    const playerB = this.tournamentManager.transferManager._findPlayerInRoom(loserFinal.id, loserB.id);
    
    console.log(`🏆 Found player A: ${playerA ? playerA.username : 'NOT FOUND'}`);
    console.log(`🏆 Found player B: ${playerB ? playerB.username : 'NOT FOUND'}`);
    
    if (!playerA || !playerB) {
      console.error(`🏆 Could not find loser final players`);
      console.error(`🏆 Looking for: ${loserA.username}(${loserA.id}) and ${loserB.username}(${loserB.id})`);
      console.error(`🏆 Available players in loser final: [${loserFinal.players.map(p => `${p.username}(${p.id})`).join(', ')}]`);
      return;
    }
    
    // ⭐ FIX: Reset both players for clean start
    playerA.resetForNewGame();
    playerB.resetForNewGame();
    
    // Send game initialization to both players
    [playerA, playerB].forEach((player, index) => {
      if (player.ws && player.ws.readyState === 1) {
        const gameInitData = {
          type: 'gameInit',
          roomId: loserFinal.id,
          playerId: player.id,
          opponentId: index === 0 ? playerB.id : playerA.id,
          playerName: player.username,
          opponentName: index === 0 ? playerB.username : playerA.username,
          role: index, // 0 for playerA, 1 for playerB
          matchType: 'tournament_loser_final'
        };
        
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