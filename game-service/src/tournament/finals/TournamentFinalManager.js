/**
 * Update players in final room when both are present (opponent information)
 * @param {Object} finalRoom
 */
export function updateFinalRoomPlayersWithOpponent(finalRoom) {
  if (finalRoom.players.length !== 2) return;
  const playerPositions = {};
  finalRoom.players.forEach(player => {
    playerPositions[player.id] = player.positionZ;
  });
  finalRoom.players.forEach((player, index) => {
    const opponent = finalRoom.players[1 - index];
    if (player.ws && player.ws.readyState === 1) {
      try {
        const syncMessage = {
          type: 'sync',
          playerPositions: playerPositions
        };
        player.ws.send(JSON.stringify(syncMessage));
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
      } catch (e) {}
    }
  });
}

/**
 * Start both final games with proper timing coordination
 */
export function startBothFinalsWithTiming(finalRoomA, finalRoomB, tournamentId, roomManager, gameEngine) {
  updateFinalRoomPlayersWithOpponent(finalRoomA);
  updateFinalRoomPlayersWithOpponent(finalRoomB);
  finalRoomA.players.forEach(p => { p.readyToPlay = true; });
  finalRoomB.players.forEach(p => { p.readyToPlay = true; });
  [finalRoomA, finalRoomB].forEach(room => {
    room.ready = false;
    room.gameStarted = false;
    room.isGameOver = false;
    room.ball = null;
  });
  setTimeout(() => {
    const roomACheck = roomManager.getRoom(finalRoomA.id);
    const roomBCheck = roomManager.getRoom(finalRoomB.id);
    if (roomACheck && roomBCheck &&
        roomACheck.metadata.tournamentId === tournamentId &&
        roomBCheck.metadata.tournamentId === tournamentId) {
      gameEngine.checkRoomReady(finalRoomA.id);
      gameEngine.checkRoomReady(finalRoomB.id);
    }
  }, 6000);
}

/**
 * Start winners final only (when losers final was forfeited)
 */
export function startWinnersFinalWithTiming(finalRoomA, tournamentId, roomManager, gameEngine) {
  updateFinalRoomPlayersWithOpponent(finalRoomA);
  finalRoomA.players.forEach(p => { p.readyToPlay = true; });
  finalRoomA.ready = false;
  finalRoomA.gameStarted = false;
  finalRoomA.isGameOver = false;
  finalRoomA.ball = null;
  setTimeout(() => {
    const roomCheck = roomManager.getRoom(finalRoomA.id);
    if (roomCheck && roomCheck.metadata.tournamentId === tournamentId) {
      gameEngine.checkRoomReady(finalRoomA.id);
    }
  }, 6000);
}

/**
 * Start losers final only (edge case)
 */
export function startLosersFinalWithTiming(finalRoomB, tournamentId, roomManager, gameEngine) {
  updateFinalRoomPlayersWithOpponent(finalRoomB);
  finalRoomB.players.forEach(p => { p.readyToPlay = true; });
  finalRoomB.ready = false;
  finalRoomB.gameStarted = false;
  finalRoomB.isGameOver = false;
  finalRoomB.ball = null;
  setTimeout(() => {
    const roomCheck = roomManager.getRoom(finalRoomB.id);
    if (roomCheck && roomCheck.metadata.tournamentId === tournamentId) {
      gameEngine.checkRoomReady(finalRoomB.id);
    }
  }, 6000);
}

/**
 * Handle incomplete final rooms due to forfeits
 */
export function handleIncompleteFinalRooms(finalRoomA, finalRoomB, tournamentId, roomManager, gameEngine) {
  setTimeout(() => {
    handleIncompleteFinalRoomsAfterDelay(finalRoomA, finalRoomB, tournamentId, roomManager, gameEngine);
  }, 2000);
}

/**
 * Handle incomplete final rooms after delay to avoid race conditions
 */
export function handleIncompleteFinalRoomsAfterDelay(finalRoomA, finalRoomB, tournamentId, roomManager, gameEngine) {
  const currentFinalRoomA = roomManager.getRoom(finalRoomA.id);
  const currentFinalRoomB = roomManager.getRoom(finalRoomB.id);
  if (!currentFinalRoomA || !currentFinalRoomB) return;
  const winnersComplete = currentFinalRoomA.players.length === 2;
  const losersComplete = currentFinalRoomB.players.length === 2;
  const losersHasForfeit = currentFinalRoomB.metadata?.hasForfeitMissingPlayer === true;
  
  if (winnersComplete && losersComplete) {
    startBothFinalsWithTiming(currentFinalRoomA, currentFinalRoomB, tournamentId, roomManager, gameEngine);
  } else if (winnersComplete && !losersComplete) {
    startWinnersFinalWithTiming(currentFinalRoomA, tournamentId, roomManager, gameEngine);
    
    // ⭐ NEW: Handle automatic 3rd place for player in losers final
    if (currentFinalRoomB.players.length === 1 && losersHasForfeit) {
      handleAutomaticThirdPlace(currentFinalRoomB, roomManager);
    }
  } else if (!winnersComplete && losersComplete) {
    startLosersFinalWithTiming(currentFinalRoomB, tournamentId, roomManager, gameEngine);
  }
}

/**
 * Handle automatic 3rd place award when player is alone in losers final due to forfeit
 * @param {Object} losersFinalRoom - The losers final room
 * @param {Object} roomManager - The room manager
 */
export function handleAutomaticThirdPlace(losersFinalRoom, roomManager) {
  const remainingPlayer = losersFinalRoom.players[0];
  const forfeitPlayer = losersFinalRoom.metadata.forfeitMissingPlayer;
  
  if (!remainingPlayer || !forfeitPlayer) {
    console.error('🏆 Cannot award automatic 3rd place - missing player data');
    return;
  }
  
  // Create automatic 3rd place match data
  const automaticThirdPlaceData = {
    type: 'gameEnd',
    roomId: losersFinalRoom.id,
    winner: {
      id: remainingPlayer.id,
      username: remainingPlayer.username,
      score: 11
    },
    loser: {
      id: forfeitPlayer.id,
      username: forfeitPlayer.username,
      score: 0
    },
    gameStats: {
      totalRebounds: 0,
      finalScore: '11-0',
      ballSpeed: 0,
      lastHitBy: null,
      forfeitReason: 'opponent_forfeited_losers_final',
      automaticThirdPlace: true
    },
    matchType: 'final',
    finalMatchType: 'losers',
    tournamentStage: 'final',
    serverTime: Date.now(),
    tournamentAdvancement: {
      stage: 'final',
      result: 'automatic_third_place',
      message: 'Congratulations! You finish in 3rd place!',
      finalPlacement: 3
    }
  };
  
  // Send automatic 3rd place message to the player
  if (remainingPlayer.ws && remainingPlayer.ws.readyState === 1) {
    remainingPlayer.ws.send(JSON.stringify(automaticThirdPlaceData));
    console.log(`🏆 Awarded automatic 3rd place to ${remainingPlayer.username} due to forfeit in losers final`);
  }
  
  // Clean up the losers final room
  roomManager.removeRoom(losersFinalRoom.id);
  console.log(`🏆 Removed losers final room ${losersFinalRoom.id} after automatic 3rd place award`);
} 