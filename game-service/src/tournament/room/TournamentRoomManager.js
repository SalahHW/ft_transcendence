/**
 * Generate a unique tournament identifier
 * @param {Object} counterObj - An object with a counter property
 * @returns {string}
 */
export function generateTournamentId(counterObj) {
  const timestamp = Date.now().toString(36);
  const counter = (counterObj.counter = (counterObj.counter || 0) + 1).toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `tournament_${timestamp}_${counter}_${random}`;
}

/**
 * Find suitable tournament room for a player with enhanced isolation
 * @param {Object} roomManager
 * @param {Object} player
 * @param {Object} preferences
 * @returns {Object|null}
 */
export function findSuitableTournamentRoom(roomManager, player, preferences = {}) {
  const availableRooms = roomManager.getAvailableRooms();
  const tournamentRooms = availableRooms.filter(room => {
    if (!room.metadata?.isTournament) return false;
    if (room.metadata?.tournamentType !== 'elimination') return false;
    if (room.players.length >= 4) return false;
    const hasNonTournamentPlayers = room.players.some(p => !p.tournament);
    if (hasNonTournamentPlayers) return false;
    if (room.metadata?.status === 'split_into_semifinals') return false;
    return true;
  });
  return tournamentRooms.length > 0 ? tournamentRooms[0] : null;
}

/**
 * Create a new tournament room with unique tournament-specific naming
 * @param {Object} roomManager
 * @param {Object} player
 * @param {Object} preferences
 * @returns {Object}
 */
export function createTournamentRoom(roomManager, player, preferences = {}) {
  const tournamentId = generateTournamentId(roomManager._tournamentCounterObj || (roomManager._tournamentCounterObj = {}));
  const room = roomManager.createRoom(null, {
    maxPlayers: 4,
    gameMode: 'tournament',
    metadata: {
      isTournament: true,
      createdBy: player.id,
      tournamentType: 'elimination',
      tournamentId: tournamentId,
      createdAt: new Date().toISOString(),
      preferences
    }
  });
  return room;
}

/**
 * Handle tournament player room assignment
 * @param {Object} roomManager
 * @param {Object} player
 * @param {Object} preferences
 * @returns {Object}
 */
export function handleTournamentPlayer(roomManager, player, preferences = {}) {
  let room = findSuitableTournamentRoom(roomManager, player, preferences);
  if (!room) {
    room = createTournamentRoom(roomManager, player, preferences);
  }
  const role = room.addPlayer(player);
  if (room.players.length === 4) {
    createSemiFinalMatches(roomManager, room);
    const tournamentId = room.metadata.tournamentId;
    const semiFinalRoomA = roomManager.getRoom(`${tournamentId}_sf_A`);
    const semiFinalRoomB = roomManager.getRoom(`${tournamentId}_sf_B`);
    if (semiFinalRoomA && semiFinalRoomA.players.some(p => p.id === player.id)) {
      return {
        room: semiFinalRoomA,
        roomId: semiFinalRoomA.id,
        role: semiFinalRoomA.players.findIndex(p => p.id === player.id)
      };
    } else if (semiFinalRoomB && semiFinalRoomB.players.some(p => p.id === player.id)) {
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
 * @param {Object} roomManager
 * @param {Object} waitingRoom
 */
export function createSemiFinalMatches(roomManager, waitingRoom) {
  const players = [...waitingRoom.players];
  if (players.length !== 4) return;
  const tournamentId = waitingRoom.metadata.tournamentId;
  const baseId = `${tournamentId}_sf`;
  const roomAId = `${baseId}_A`;
  const semiFinalA = roomManager.createRoom(roomAId, {
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
  const roomBId = `${baseId}_B`;
  const semiFinalB = roomManager.createRoom(roomBId, {
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
  semiFinalA.addPlayer(players[0]);
  semiFinalA.addPlayer(players[1]);
  semiFinalB.addPlayer(players[2]);
  semiFinalB.addPlayer(players[3]);
  updatePlayerRoomAssociations(players, roomAId, roomBId);
  waitingRoom.players = [];
  waitingRoom.metadata.status = 'split_into_semifinals';
  waitingRoom.metadata.semiFinalRooms = [roomAId, roomBId];
  const finalRoomAId = `${tournamentId}_final_winners`;
  const finalRoomBId = `${tournamentId}_final_losers`;
  roomManager.createRoom(finalRoomAId, {
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
  roomManager.createRoom(finalRoomBId, {
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
  semiFinalA.metadata.finalRoomA = finalRoomAId;
  semiFinalA.metadata.finalRoomB = finalRoomBId;
  semiFinalB.metadata.finalRoomA = finalRoomAId;
  semiFinalB.metadata.finalRoomB = finalRoomBId;
  waitingRoom.metadata.finalRooms = [finalRoomAId, finalRoomBId];
  
  // ⭐ SEMI-FINAL GAME START: Add delay to ensure WebSocket connections are stable
  // This matches the pattern used in finals but with shorter delay for semi-finals
  setTimeout(() => {
    // Import gameEngine here to avoid circular dependencies
    import('../../game/GameEngine.js').then(({ gameEngine }) => {
      // Check if rooms still exist and start games
      const currentSemiFinalA = roomManager.getRoom(roomAId);
      const currentSemiFinalB = roomManager.getRoom(roomBId);
      
      if (currentSemiFinalA && currentSemiFinalA.players.length === 2) {
        console.log(`🏆 Starting semi-final A game in room ${roomAId}`);
        gameEngine.checkRoomReady(roomAId);
      }
      
      if (currentSemiFinalB && currentSemiFinalB.players.length === 2) {
        console.log(`🏆 Starting semi-final B game in room ${roomBId}`);
        gameEngine.checkRoomReady(roomBId);
      }
    }).catch(error => {
      console.error('🏆 Error starting semi-final games:', error);
    });
  }, 500); // 500ms delay for semi-finals (vs 6000ms for finals)
}

/**
 * Update player room associations when moving to semi-final rooms
 * @param {Array} players
 * @param {string} roomAId
 * @param {string} roomBId
 */
export function updatePlayerRoomAssociations(players, roomAId, roomBId) {
  [players[0], players[1]].forEach(player => {
    if (player.ws) {
      player.ws.roomId = roomAId;
      player.roomId = roomAId;
    }
  });
  [players[2], players[3]].forEach(player => {
    if (player.ws) {
      player.ws.roomId = roomBId;
      player.roomId = roomBId;
    }
  });
} 