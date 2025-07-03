/**
 * Get placement suffix for display (1st, 2nd, 3rd, 4th)
 * @param {number} placement - The placement number
 * @returns {string} The placement suffix string
 */
export function getPlacementSuffix(placement) {
  switch (placement) {
    case 1: return 'st';
    case 2: return 'nd'; 
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Get tournament room statistics
 * @param {Array} allRooms - Array of all rooms
 * @param {Function} isTournamentRoom - Function to check if room is a tournament room
 * @param {Function} isSemiFinalRoom - Function to check if room is a semi-final room
 * @param {Function} isFinalRoom - Function to check if room is a final room
 * @returns {Object} - Tournament room stats
 */
export function getTournamentStats(allRooms, isTournamentRoom, isSemiFinalRoom, isFinalRoom) {
  const tournamentRooms = allRooms.filter(room => isTournamentRoom(room));
  const semiFinalRooms = tournamentRooms.filter(room => isSemiFinalRoom(room));
  const finalRooms = tournamentRooms.filter(room => isFinalRoom(room));
  const waitingRooms = tournamentRooms.filter(room => 
    !isSemiFinalRoom(room) && !isFinalRoom(room)
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