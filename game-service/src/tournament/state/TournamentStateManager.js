/**
 * Check if a room is a tournament room
 * @param {Object} room
 * @returns {boolean}
 */
export function isTournamentRoom(room) {
  return room.metadata?.isTournament === true;
}

/**
 * Check if a room is a semi-final room
 * @param {Object} room
 * @returns {boolean}
 */
export function isSemiFinalRoom(room) {
  return room.metadata?.tournamentType === 'semifinal';
}

/**
 * Check if a room is a final room
 * @param {Object} room
 * @returns {boolean}
 */
export function isFinalRoom(room) {
  return room.metadata?.tournamentType === 'final';
}

/**
 * Check if both semi-finals are completed by looking at final room states
 * @param {string} tournamentId
 * @param {Object} roomManager
 * @returns {boolean}
 */
export function areBothSemiFinalsCompleted(tournamentId, roomManager) {
  const allRooms = roomManager.getAllRooms();
  const finalRooms = allRooms.filter(room =>
    room.metadata?.tournamentId === tournamentId &&
    isFinalRoom(room)
  );
  if (finalRooms.length !== 2) return false;
  const finalRoomA = finalRooms.find(r => r.metadata?.finalMatch === 'winners');
  const finalRoomB = finalRooms.find(r => r.metadata?.finalMatch === 'losers');
  if (!finalRoomA || !finalRoomB) return false;
  const winnersHasPlayers = finalRoomA.players.length > 0;
  const losersHasPlayers = finalRoomB.players.length > 0;
  const losersHasForfeit = finalRoomB.metadata?.hasForfeitMissingPlayer === true;
  const bothCompleted = winnersHasPlayers && (losersHasPlayers || losersHasForfeit);
  if (finalRoomA.players.length > 0 && finalRoomB.players.length > 0) return true;
  return bothCompleted;
}

/**
 * Get the other semi-final room in the tournament
 * @param {string} currentSemiFinalRoomId
 * @param {string} tournamentId
 * @param {Object} roomManager
 * @returns {Object|null}
 */
export function getOtherSemiFinalRoom(currentSemiFinalRoomId, tournamentId, roomManager) {
  const allRooms = roomManager.getAllRooms();
  const semiFinalRooms = allRooms.filter(room =>
    room.metadata?.tournamentId === tournamentId &&
    isSemiFinalRoom(room) &&
    room.id !== currentSemiFinalRoomId
  );
  return semiFinalRooms.length === 1 ? semiFinalRooms[0] : null;
}

/**
 * Check if the other semi-final room is empty
 * @param {string} currentSemiFinalRoomId
 * @param {string} tournamentId
 * @param {Object} roomManager
 * @returns {boolean}
 */
export function isOtherSemiFinalEmpty(currentSemiFinalRoomId, tournamentId, roomManager) {
  const otherSemiFinal = getOtherSemiFinalRoom(currentSemiFinalRoomId, tournamentId, roomManager);
  if (!otherSemiFinal) return false;
  return otherSemiFinal.metadata?.isEmptySemiFinal === true || otherSemiFinal.players.length === 0;
}

/**
 * Mark a semi-final room as empty (both players disconnected)
 * @param {string} semiFinalRoomId
 * @param {Object} roomManager
 */
export function markSemiFinalAsEmpty(semiFinalRoomId, roomManager) {
  const semiFinalRoom = roomManager.getRoom(semiFinalRoomId);
  if (!semiFinalRoom || !isSemiFinalRoom(semiFinalRoom)) return;
  semiFinalRoom.metadata.isEmptySemiFinal = true;
  semiFinalRoom.metadata.status = 'empty';
}

/**
 * Check if all players in the final rooms are from the same semi-final
 * @param {Array} winnersFinalPlayers
 * @param {Array} losersFinalPlayers
 * @param {string} tournamentId
 * @param {Object} roomManager
 * @returns {boolean}
 */
export function arePlayersFromSameSemiFinal(winnersFinalPlayers, losersFinalPlayers, tournamentId, roomManager) {
  const allFinalPlayers = [...winnersFinalPlayers, ...losersFinalPlayers];
  if (allFinalPlayers.length !== 2) return false;
  const allRooms = roomManager.getAllRooms();
  const activeSemiFinalRooms = allRooms.filter(room =>
    room.metadata?.tournamentId === tournamentId &&
    isSemiFinalRoom(room) &&
    room.metadata?.status !== 'completed' &&
    room.metadata?.status !== 'empty'
  );
  const noActiveSemiFinals = activeSemiFinalRooms.length === 0;
  const hasOneInWinners = winnersFinalPlayers.length === 1;
  const hasOneInLosers = losersFinalPlayers.length === 1;
  return noActiveSemiFinals && hasOneInWinners && hasOneInLosers;
} 