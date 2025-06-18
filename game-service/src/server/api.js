import { setPlayerReady } from './gameState.js';
import { GAME_CONFIG, HTTP_STATUS } from '../core/constants.js';
import { ValidationUtils, LogUtils } from '../utils/helpers.js';
import { playerManager } from '../player/PlayerManager.js';
import { gameStateManager } from '../game/GameStateManager.js';
import { gameEngine } from '../game/GameEngine.js';
import { tournamentManager } from '../room/tournamentManager.js';
import { roomManager } from '../room/RoomManager.js';

// Constants for paddle movement
const PADDLE_PULSE_DISTANCE = 1.0;
const PADDLE_BOUNDARY = GAME_CONFIG.PADDLE_BOUNDARY;

// Helper function for paddle movement
function movePaddle(player, direction) {
  const currentPos = player.positionZ;
  let newPos;
  
  if (direction === 'up') {
    newPos = Math.max(-PADDLE_BOUNDARY, currentPos - PADDLE_PULSE_DISTANCE);
  } else if (direction === 'down') {
    newPos = Math.min(PADDLE_BOUNDARY, currentPos + PADDLE_PULSE_DISTANCE);
  } else {
    throw new Error('Invalid direction');
  }
  
  player.positionZ = newPos;
  player.lastActivity = Date.now();
  
  console.log(`🎮 HTTP ${direction.toUpperCase()}: Player ${player.id} moved from ${currentPos} to ${newPos}`);
  
  // Broadcast the new position
  if (player.roomId) {
    gameEngine.broadcastToRoom(player.roomId, {
      type: 'paddleMove',
      playerId: player.id,
      positionZ: player.positionZ,
      roomId: player.roomId
    });
  }
  
  return { currentPos, newPos };
}

export async function registerApiRoutes(fastify) {

  // GET /api/players: Return list of connected players with usernames
  fastify.get('/api/players', async (reply) => {
    try {
      console.log('API request: GET /api/players');
      const playerList = playerManager.getPlayersSummary();
      return reply.status(HTTP_STATUS.OK).send({
        status: 'success',
        data: playerList,
        count: playerList.length,
      });
    } catch (error) {
      console.error('Error in /api/players:', error);
      return reply.status(500).send({
        status: 'error',
        message: 'Internal server error',
      });
    }
  });

  // POST /api/players: Create a new player with a username
  fastify.post('/api/players', async (request, reply) => {
    try {
      console.log('API request: POST /api/players');
      const { username, tournament = false } = request.body || {};
      
      const player = playerManager.registerPlayerWithUsername(username, { tournament });
      
      console.log(`Created player ${player.id} with username ${username}, tournament: ${tournament}`);
      return reply.status(201).send({
        status: 'success',
        data: { id: player.id, username: player.username, tournament: player.tournament },
      });
    } catch (error) {
      console.error('Error in POST /api/players:', error);
      const status = error.message.includes('Invalid username') ? HTTP_STATUS.BAD_REQUEST : 500;
      return reply.status(status).send({
        status: 'error',
        message: error.message || 'Internal server error',
      });
    }
  });

  // POST /api/players/:id/ready: Set player ready status
  fastify.post('/api/players/:id/ready', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: true  // Allow empty object
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      const isReady = playerManager.setPlayerReady(id);
      
      return reply.status(200).send({
        status: 'success',
        message: 'Player ready status updated',
        data: { playerId: id, isReady }
      });
    } catch (error) {
      console.error('Error in POST /api/players/:id/ready:', error);
      const status = error.message.includes('not found') ? 404 : 500;
      return reply.status(status).send({
        status: 'error',
        message: error.message || 'Internal server error',
      });
    }
  });

  // Helper function for paddle endpoint validation
  const validatePaddleRequest = (id) => {
    const player = playerManager.getPlayer(id);
    if (!player) {
      return { error: { status: 404, message: 'Player not found' } };
    }
    if (!player.isConnected()) {
      return { error: { status: 400, message: 'Player not connected to game' } };
    }
    return { player };
  };

  // POST /api/players/:id/paddle/up - Move paddle up
  fastify.post('/api/players/:id/paddle/up', async (request, reply) => {
    try {
      const { id } = request.params;
      const validation = validatePaddleRequest(id);
      
      if (validation.error) {
        return reply.status(validation.error.status).send({
          status: 'error',
          message: validation.error.message
        });
      }

      movePaddle(validation.player, 'up');
      
      return reply.status(200).send({
        status: 'success',
        message: 'Paddle moved up',
        data: { playerId: id, direction: 'up', roomId: validation.player.roomId }
      });
    } catch (error) {
      console.error('Error in POST /api/players/:id/paddle/up:', error);
      return reply.status(500).send({
        status: 'error',
        message: error.message || 'Internal server error',
      });
    }
  });

  // POST /api/players/:id/paddle/down - Move paddle down
  fastify.post('/api/players/:id/paddle/down', async (request, reply) => {
    try {
      const { id } = request.params;
      const validation = validatePaddleRequest(id);
      
      if (validation.error) {
        return reply.status(validation.error.status).send({
          status: 'error',
          message: validation.error.message
        });
      }

      movePaddle(validation.player, 'down');
      
      return reply.status(200).send({
        status: 'success',
        message: 'Paddle moved down',
        data: { playerId: id, direction: 'down', roomId: validation.player.roomId }
      });
    } catch (error) {
      console.error('Error in POST /api/players/:id/paddle/down:', error);
      return reply.status(500).send({
        status: 'error',
        message: error.message || 'Internal server error',
      });
    }
  });

  // POST /api/matches/results: Report match completion to other services
  fastify.post('/api/matches/results', async (request, reply) => {
    try {
      console.log('API request: POST /api/matches/results');
      const matchData = request.body;
      
      // Validate required match data
      const requiredFields = ['roomId', 'matchEndTime', 'winner', 'loser', 'gameStats'];
      const missingFields = requiredFields.filter(field => !matchData[field]);
      
      if (missingFields.length > 0) {
        return reply.status(400).send({
          status: 'error',
          message: `Missing required fields: ${missingFields.join(', ')}`,
        });
      }

      // Forward match data to other services
      await notifyOtherServices(matchData);
      
      return reply.status(200).send({
        status: 'success',
        message: 'Match results reported successfully',
        data: { matchId: matchData.roomId }
      });
    } catch (error) {
      console.error('Error in POST /api/matches/results:', error);
      return reply.status(500).send({
        status: 'error',
        message: 'Failed to report match results',
      });
    }
  });

  /**
   * Diagnostic endpoint for monitoring parallel tournaments
   */
  fastify.get('/api/tournament-diagnostics', getTournamentDiagnostics);
}

// Service-to-service notification functions
async function notifyOtherServices(matchData) {
  const services = [
    {
      name: 'users-service',
      url: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
      endpoints: ['/api/matches/completed']
    },
    {
      name: 'stats-service', 
      url: process.env.STATS_SERVICE_URL || 'http://localhost:3002',
      endpoints: ['/api/player-stats', '/api/match-history']
    },
    {
      name: 'tournament-service',
      url: process.env.TOURNAMENT_SERVICE_URL || 'http://localhost:3003',
      endpoints: ['/api/tournament/match-result']
    }
  ];

  const notifications = services.flatMap(service => 
    service.endpoints.map(endpoint => 
      notifyService(service.name, `${service.url}${endpoint}`, matchData)
    )
  );

  await Promise.allSettled(notifications);
}

async function notifyService(serviceName, url, matchData) {
  try {

    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source-Service': 'game-service',
        'X-Match-Id': matchData.roomId
      },
      body: JSON.stringify(matchData),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`${serviceName} responded with ${response.status}`);
    }

    const responseData = await response.json();

    
    return responseData;
  } catch (error) {
    console.error(`❌ Failed to notify ${serviceName}:`, error.message);
    console.log('-'.repeat(60));
    // Could implement retry logic here
    throw error;
  }
}

// Export function to call external services from gameState
export async function reportMatchResultsToAPI(matchData) {
  try {
    // Forward match data to external services only
    await notifyOtherServices(matchData);
    console.log('✅ Match results processing completed');
  } catch (error) {
    console.error('❌ Failed to process match results:', error.message);
  }
}

/**
 * Diagnostic endpoint for monitoring parallel tournaments
 */
export const getTournamentDiagnostics = async (request, reply) => {
  try {
    console.log('🏆 Tournament diagnostics requested');
    
    const tournamentStats = tournamentManager.getTournamentStats();
    const allRooms = roomManager.getAllRooms();
    
    // Group rooms by tournament ID
    const tournamentGroups = {};
    const tournamentRooms = allRooms.filter(room => room.metadata?.isTournament);
    
    tournamentRooms.forEach(room => {
      const tournamentId = room.metadata.tournamentId || 'unknown';
      if (!tournamentGroups[tournamentId]) {
        tournamentGroups[tournamentId] = {
          tournamentId,
          rooms: [],
          totalPlayers: 0,
          roomTypes: { waiting: 0, semifinal: 0, final: 0 },
          status: 'unknown'
        };
      }
      
      tournamentGroups[tournamentId].rooms.push({
        roomId: room.id,
        type: room.metadata.tournamentType || 'unknown',
        players: room.players.length,
        maxPlayers: room.maxPlayers,
        gameStarted: room.gameStarted,
        isGameOver: room.isGameOver,
        ready: room.ready
      });
      
      tournamentGroups[tournamentId].totalPlayers += room.players.length;
      
      const roomType = room.metadata.tournamentType || 'waiting';
      if (tournamentGroups[tournamentId].roomTypes[roomType] !== undefined) {
        tournamentGroups[tournamentId].roomTypes[roomType]++;
      }
    });
    
    // Determine tournament status
    Object.values(tournamentGroups).forEach(tournament => {
      if (tournament.roomTypes.final > 0) {
        tournament.status = 'finals';
      } else if (tournament.roomTypes.semifinal > 0) {
        tournament.status = 'semifinals';
      } else {
        tournament.status = 'waiting';
      }
    });
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      tournamentStats,
      parallelTournaments: Object.keys(tournamentGroups).length,
      tournaments: tournamentGroups,
      totalTournamentRooms: tournamentRooms.length,
      totalPlayers: Object.values(tournamentGroups).reduce((sum, t) => sum + t.totalPlayers, 0),
      roomManager: {
        totalRooms: allRooms.length,
        roomCounter: roomManager._roomCounter || 0
      },
      playerManager: {
        totalPlayers: playerManager.getAllPlayers().length,
        playerCounter: playerManager._playerCounter || 0
      }
    };
    
    reply.send({
      success: true,
      diagnostics
    });
  } catch (error) {
    console.error('Tournament diagnostics error:', error.message);
    reply.status(500).send({
      success: false,
      error: 'Failed to get tournament diagnostics',
      details: error.message
    });
  }
};