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
   * Handle single semi-final edge case where only 2 players remain connected
   * This occurs when 2 players are connected and 2 are disconnected
   * Also handles forfeit winner scenarios
   */
  async handleSingleSemiFinal(waitingRoomId, roomId, winner, loser, matchData) {
    const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) {
      console.error(`🏆 Waiting room data not found for single semi-final handling`);
      return false;
    }

    const nb_players_in_waiting_room = waitingRoomData.players.length;
    const disconnectedCount = waitingRoomData.disconnectedPlayers.length;
    const connectedCount = waitingRoomData.players.filter(p => p.connected).length;
    
    console.log(`########## Connected: ${connectedCount}, Disconnected: ${disconnectedCount}`);
    console.log(`########## Waiting room data: ${nb_players_in_waiting_room}`);
    
    // ⭐ FIX: Check if both remaining players are from the same semi-final (which triggers the single semi-final edge case)
    const connectedPlayers = waitingRoomData.players.filter(p => p.connected);
    const player1 = connectedPlayers[0];
      const player2 = connectedPlayers[1];
      
      // Check which semi-final rooms they were in
      const semiFinalA = waitingRoomData.tournamentRooms.semiFinalA;
      const semiFinalB = waitingRoomData.tournamentRooms.semiFinalB;
      
      const player1InSemiFinalA = semiFinalA.players.some(p => p.id === player1.id);
      const player1InSemiFinalB = semiFinalB.players.some(p => p.id === player1.id);
      const player2InSemiFinalA = semiFinalA.players.some(p => p.id === player2.id);
      const player2InSemiFinalB = semiFinalB.players.some(p => p.id === player2.id);
      
    
      const shouldHandleTwoPlayerFinalScenario = Boolean(
        (connectedCount === 2) &&
        (disconnectedCount === 2) && ((player1InSemiFinalA && player2InSemiFinalA) || (player1InSemiFinalB && player2InSemiFinalB))
      );

    if (!shouldHandleTwoPlayerFinalScenario) {
      return false;
    }
    console.log(`########## HANDLING SINGLE SEMI-FINAL EDGE CASE OK ##########`);

    // Find the actual player objects
    const winnerPlayer = this._findPlayerInRoom(roomId, winner.id);
    const loserPlayer = this._findPlayerInRoom(roomId, loser.id);

    if (!winnerPlayer || !loserPlayer) {
      console.error(`🏆 Could not find winner or loser player objects for single semi-final handling`);
      return false;
    }
    
    // ⭐ FIX: Determine if this is a forfeit winner scenario
    const isForfeitWinner = matchData && matchData.matchType === 'tournament_forfeit';
    
    // Store the match result
    if (!waitingRoomData.semiFinalResults) {
      waitingRoomData.semiFinalResults = {};
    }
    waitingRoomData.semiFinalResults[roomId] = { winner, loser };

    // Create final results to complete the tournament
    if (!waitingRoomData.finalResults) {
      waitingRoomData.finalResults = {};
    }

    // Set winner as tournament winner (1st place)
    waitingRoomData.finalResults['winner_final'] = { 
      winner: winner, 
      loser: loser,
      isSingleSemiFinal: true,
      isForfeitWinner: isForfeitWinner
    };

    // Set loser as 2nd place (no loser final needed)
    waitingRoomData.finalResults['loser_final'] = { 
      winner: loser, 
      loser: loser, // Same player since no actual loser final
      isSingleSemiFinal: true,
      isForfeitWinner: isForfeitWinner
    };

    // Send completion messages to both players
    if (winnerPlayer.ws && winnerPlayer.ws.readyState === 1) {
      try {
        const winnerMessage = isForfeitWinner 
          ? '🏆 Tournament complete! You finished 1st place (forfeit win)!'
          : '🏆 Tournament complete! You finished 1st place!';
          
        winnerPlayer.ws.send(JSON.stringify({
          type: 'tournamentAdvancement',
          status: 'final_match_complete',
          playerPlacement: 1,
          isWinner: true,
          opponentName: loser.username,
          message: winnerMessage,
          isForfeitWinner: isForfeitWinner
        }));

        // Close WebSocket connection for 1st place player
        console.log(`🏆 Closing WebSocket connection for 1st place player ${winnerPlayer.username} (${winnerPlayer.id})`);
        winnerPlayer.ws.close(1000, 'Tournament completed - 1st place');
      } catch (error) {
        console.error(`Failed to send 1st place completion to ${winnerPlayer.username}:`, error);
      }
    }

    if (loserPlayer.ws && loserPlayer.ws.readyState === 1) {
      try {
        const loserMessage = isForfeitWinner 
          ? '🏆 Tournament complete! You finished 2nd place (opponent forfeit)!'
          : '🏆 Tournament complete! You finished 2nd place!';
          
        loserPlayer.ws.send(JSON.stringify({
          type: 'tournamentAdvancement',
          status: 'final_match_complete',
          playerPlacement: 2,
          isWinner: false,
          opponentName: winner.username,
          message: loserMessage,
          isForfeitWinner: isForfeitWinner
        }));

        // Close WebSocket connection for 2nd place player
        console.log(`🏆 Closing WebSocket connection for 2nd place player ${loserPlayer.username} (${loserPlayer.id})`);
        loserPlayer.ws.close(1000, 'Tournament completed - 2nd place');
      } catch (error) {
        console.error(`Failed to send 2nd place completion to ${loserPlayer.username}:`, error);
      }
    }

    // Mark tournament as finished
    waitingRoomData.phase = 'FINISHED';

    // Send tournament completion message to all players
    this.tournamentManager.communicationManager._sendTournamentCompletionMessage(waitingRoomId, { winner, loser });

    // Schedule cleanup
    setTimeout(() => {
      this.tournamentManager.cleanupManager.cleanupWaitingRoom(waitingRoomId);
    }, 10000); // 10 seconds delay to allow players to see results
    return true;
  }

  /**
   * Find player in a specific room
   */
  _findPlayerInRoom(roomId, playerId) {
    const room = gameStateManager.getRoom(roomId);
    if (!room || !room.players) return null;
    return room.players.find(p => p.id === playerId);
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
    
     // Handle single semi-final edge case
    const singleSemiFinalHandled = await this.handleSingleSemiFinal(waitingRoomId, roomId, winner, loser, matchData);
    // If single semi-final was handled, don't proceed with normal transfer
    if (singleSemiFinalHandled) {
      return;
    }
    
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
      
      // ⭐ FIX: Handle case where loser final cannot be played due to disconnections
      if (winnerFinalResult && !loserFinalResult) {
        const loserFinal = waitingRoomData.tournamentRooms.loserFinal;
        if (loserFinal && loserFinal.players.length === 0) {
          console.log(`🏆 Loser final room is empty, checking if we can complete tournament with only winner final`);
          
          // Check if we have semi-final results to determine 3rd and 4th place
          const semiFinalAResult = waitingRoomData.semiFinalResults?.[waitingRoomData.tournamentRooms.semiFinalA.id];
          const semiFinalBResult = waitingRoomData.semiFinalResults?.[waitingRoomData.tournamentRooms.semiFinalB.id];
          
          if (semiFinalAResult && semiFinalBResult) {
            console.log(`🏆 Both semi-finals have results, completing tournament with forfeit for loser final`);
            
            // Create a forfeit result for the loser final
            const loserA = semiFinalAResult.loser;
            const loserB = semiFinalBResult.loser;
            
            // Determine 3rd and 4th place based on who disconnected first
            // For now, we'll assume the first loser gets 3rd place
            const thirdPlace = loserA;
            const fourthPlace = loserB;
            
            // Store the forfeit result
            waitingRoomData.finalResults['loser_final'] = { 
              winner: thirdPlace, 
              loser: fourthPlace,
              isForfeit: true 
            };
            
            console.log(`🏆 Tournament completed with forfeit: ${thirdPlace.username} gets 3rd place, ${fourthPlace.username} gets 4th place`);
            
            // Send tournament completion message to all players
            this.tournamentManager.communicationManager._sendTournamentCompletionMessage(waitingRoomId, matchData);
            
            // Mark tournament as finished
            waitingRoomData.phase = 'FINISHED';
            
            // Schedule cleanup
            setTimeout(() => {
              this.tournamentManager.cleanupManager.cleanupWaitingRoom(waitingRoomId);
            }, 10000); // 10 seconds delay to allow players to see results
          }
        }
      }
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