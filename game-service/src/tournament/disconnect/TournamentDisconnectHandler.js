/**
 * Check if a player is alone in the entire tournament and award automatic victory
 * @param {string} tournamentId
 * @param {Object} roomManager
 * @returns {Object|null}
 */
export function checkForLonePlayerInTournament(tournamentId, roomManager) {
  const allRooms = roomManager.getAllRooms();
  const tournamentRooms = allRooms.filter(room =>
    room.metadata?.tournamentId === tournamentId
  );
  let allPlayers = [];
  tournamentRooms.forEach(room => {
    if (room.players && room.players.length > 0) {
      allPlayers = allPlayers.concat(room.players);
    }
  });
  if (allPlayers.length === 1) {
    return allPlayers[0];
  }
  return null;
}

/**
 * Award automatic tournament victory to a lone player
 * @param {Object} lonePlayer
 * @param {string} tournamentId
 * @param {Object} roomManager
 * @param {Object} LogUtils
 * @param {Object} BaseDisconnectUtils
 */
export function awardAutomaticTournamentVictory(lonePlayer, tournamentId, roomManager, LogUtils, BaseDisconnectUtils) {
  const victoryMatchData = {
    roomId: lonePlayer.roomId || 'tournament_victory',
    winner: {
      id: lonePlayer.id,
      username: lonePlayer.username,
      score: 11
    },
    loser: {
      id: 'tournament_opponents',
      username: 'All Opponents Disconnected',
      score: 0
    },
    gameStats: {
      totalRebounds: 0,
      finalScore: '11-0',
      ballSpeed: 0,
      lastHitBy: null,
      forfeitReason: 'all_opponents_disconnected',
      automaticVictory: true
    },
    matchType: 'tournament_victory',
    tournamentStage: 'automatic_victory',
    serverTime: Date.now()
  };
  if (lonePlayer.ws && lonePlayer.ws.readyState === 1) {
    const victoryMessage = {
      type: 'gameEnd',
      ...victoryMatchData,
      tournamentAdvancement: {
        stage: 'automatic_victory',
        result: 'tournament_winner',
        message: 'Congratulations! You win the tournament! All other players disconnected.',
        finalPlacement: 1
      },
      tournamentPlacements: {
        firstPlace: {
          id: lonePlayer.id,
          username: lonePlayer.username,
          reason: 'automatic_victory'
        }
      }
    };
    lonePlayer.ws.send(JSON.stringify(victoryMessage));
  }
  if (LogUtils && LogUtils.logMatchCompletion) {
    LogUtils.logMatchCompletion(victoryMatchData);
  }
  if (BaseDisconnectUtils && BaseDisconnectUtils.reportResults) {
    BaseDisconnectUtils.reportResults(victoryMatchData);
  }
  const allRooms = roomManager.getAllRooms();
  const tournamentRooms = allRooms.filter(room =>
    room.metadata?.tournamentId === tournamentId
  );
  tournamentRooms.forEach(room => {
    roomManager.removeRoom(room.id);
  });
  setTimeout(() => {
    if (lonePlayer.ws && lonePlayer.ws.readyState === 1) {
      lonePlayer.ws.close();
    }
  }, 2000);
}

/**
 * Send direct final placement messages to players
 * @param {Object} winnerPlayer
 * @param {Object} loserPlayer
 * @param {Object} matchData
 * @param {string} semiFinalRoomId
 */
export function sendDirectFinalPlacement(winnerPlayer, loserPlayer, matchData, semiFinalRoomId) {
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
}

/**
 * Mark the losers final room with forfeit information
 * @param {Object} losersFinalRoom
 * @param {Object} forfeitPlayer
 * @param {string} reason
 */
export function markLosersFinalWithForfeit(losersFinalRoom, forfeitPlayer, reason) {
  losersFinalRoom.metadata.hasForfeitMissingPlayer = true;
  losersFinalRoom.metadata.forfeitMissingPlayer = {
    id: forfeitPlayer.id,
    username: forfeitPlayer.username,
    placement: 4,
    reason: reason
  };
} 