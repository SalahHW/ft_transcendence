/**
 * Transfer a player to a final room in waiting state
 * @param {Object} player
 * @param {Object} finalRoom
 * @param {string} fromRoomId
 * @param {string} playerType
 */
export function transferPlayerToFinalRoom(player, finalRoom, fromRoomId, playerType) {
  player.readyToPlay = false;
  player.score = 0;
  player.playerScore = 0;
  player.gamesWon = player.gamesWon || 0;
  player.paddlePosition = { x: 0, y: 0, z: 0 };
  player.positionZ = 0;
  if (playerType === 'loser' && finalRoom.metadata?.hasForfeitMissingPlayer && finalRoom.players.length > 0) {
    delete finalRoom.metadata.hasForfeitMissingPlayer;
    delete finalRoom.metadata.forfeitMissingPlayer;
  }
  if (player.ws) {
    player.ws.roomId = finalRoom.id;
    player.roomId = finalRoom.id;
  }
  const role = finalRoom.addPlayer(player);
  setTimeout(() => {
    sendTransferMessagesToPlayer(player, finalRoom, playerType, role);
  }, 500);
}

/**
 * Send transfer messages to player after delay to ensure connection stability
 * @param {Object} player
 * @param {Object} finalRoom
 * @param {string} playerType
 * @param {number} role
 */
export function sendTransferMessagesToPlayer(player, finalRoom, playerType, role) {
  if (player.ws && player.ws.readyState === 1) {
    try {
      const syncMessage = {
        type: 'sync',
        playerPositions: {
          [player.id]: player.positionZ
        }
      };
      player.ws.send(JSON.stringify(syncMessage));
    } catch (e) {}
  }
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
    } catch (e) {}
  }
}

/**
 * Handle semi-final game completion and transfer players to final rooms
 * @param {string} semiFinalRoomId
 * @param {Object} matchData
 * @param {Object} roomManager
 * @param {Object} gameEngine
 * @param {Object} disconnectHandler
 * @param {Object} finalManager
 * @param {Object} stateManager
 */
export function handleSemiFinalCompletion(semiFinalRoomId, matchData, roomManager, gameEngine, disconnectHandler, finalManager, stateManager) {
  const semiFinalRoom = roomManager.getRoom(semiFinalRoomId);
  if (!semiFinalRoom || !stateManager.isSemiFinalRoom(semiFinalRoom)) return;
  const winner = matchData.winner;
  const loser = matchData.loser;
  const tournamentId = semiFinalRoom.metadata.tournamentId;
  const isForfeitVictory = matchData.gameStats?.forfeitReason || matchData.disconnectionReason;
  const finalRoomAId = semiFinalRoom.metadata.finalRoomA;
  const finalRoomBId = semiFinalRoom.metadata.finalRoomB;
  if (!finalRoomAId || !finalRoomBId) return;
  const finalRoomA = roomManager.getRoom(finalRoomAId);
  const finalRoomB = roomManager.getRoom(finalRoomBId);
  if (!finalRoomA || !finalRoomB) return;
  const otherSemiFinalEmpty = stateManager.isOtherSemiFinalEmpty(semiFinalRoomId, tournamentId, roomManager);
  const noPlayersInFinals = finalRoomA.players.length === 0 && finalRoomB.players.length === 0;
  if (otherSemiFinalEmpty && noPlayersInFinals) {
    const winnerPlayer = semiFinalRoom.players.find(p => p.id === winner.id);
    const loserPlayer = semiFinalRoom.players.find(p => p.id === loser.id);
    if (!winnerPlayer || !loserPlayer) return;
    disconnectHandler.sendDirectFinalPlacement(winnerPlayer, loserPlayer, matchData, semiFinalRoomId);
    semiFinalRoom.players = [];
    semiFinalRoom.metadata.status = 'completed_with_direct_placement';
    if (finalRoomAId) roomManager.removeRoom(finalRoomAId);
    if (finalRoomBId) roomManager.removeRoom(finalRoomBId);
    if (winnerPlayer.ws) winnerPlayer.ws.close();
    if (loserPlayer.ws) loserPlayer.ws.close();
    return;
  }
  const winnerPlayer = semiFinalRoom.players.find(p => p.id === winner.id);
  const loserPlayer = semiFinalRoom.players.find(p => p.id === loser.id);
  if (!winnerPlayer || !loserPlayer) return;
  transferPlayerToFinalRoom(winnerPlayer, finalRoomA, semiFinalRoomId, 'winner');
  if (!isForfeitVictory) {
    transferPlayerToFinalRoom(loserPlayer, finalRoomB, semiFinalRoomId, 'loser');
  } else {
    disconnectHandler.markLosersFinalWithForfeit(finalRoomB, loser, 'disconnected_in_semifinal');
  }
  semiFinalRoom.players = [];
  semiFinalRoom.metadata.status = 'completed';
  semiFinalRoom.metadata.playersTransferred = true;
  const bothSemiFinalsCompleted = stateManager.areBothSemiFinalsCompleted(tournamentId, roomManager);
  if (bothSemiFinalsCompleted) {
    finalManager.handleIncompleteFinalRooms(finalRoomA, finalRoomB, tournamentId, roomManager, gameEngine);
  }
  const lonePlayer = disconnectHandler.checkForLonePlayerInTournament(tournamentId, roomManager);
  if (lonePlayer) {
    disconnectHandler.awardAutomaticTournamentVictory(lonePlayer, tournamentId, roomManager);
    return;
  }
}

/**
 * Handle final match completion
 * @param {string} finalRoomId
 * @param {Object} matchData
 * @param {Object} roomManager
 */
export function handleFinalCompletion(finalRoomId, matchData, roomManager) {
  const finalRoom = roomManager.getRoom(finalRoomId);
  if (!finalRoom) return;
  const isWinnersFinal = finalRoom.metadata?.finalMatch === 'winners';
  const isLosersFinal = finalRoom.metadata?.finalMatch === 'losers';
  let winnerPlacement, loserPlacement;
  if (isWinnersFinal) {
    winnerPlacement = 1;
    loserPlacement = 2;
  } else if (isLosersFinal) {
    winnerPlacement = 3;
    loserPlacement = 4;
  } else {
    winnerPlacement = 1;
    loserPlacement = 2;
  }
  finalRoom.isGameOver = true;
} 