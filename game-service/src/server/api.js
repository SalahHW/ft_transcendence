import { setPlayerReady } from './gameState.js';
import { GAME_CONFIG, HTTP_STATUS } from '../core/constants.js';
import { ValidationUtils, LogUtils } from '../utils/helpers.js';
import { playerManager } from '../player/PlayerManager.js';

export async function registerApiRoutes(fastify, options) {
  const { players } = options;

  // GET /api/players: Return list of connected players with usernames
  fastify.get('/api/players', async (request, reply) => {
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
      const { username } = request.body || {};
      
      const player = playerManager.registerPlayerWithUsername(username);
      
      console.log(`Created player ${player.id} with username ${username}`);
      return reply.status(201).send({
        status: 'success',
        data: { id: player.id, username: player.username },
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
    console.log(`Notifying ${serviceName} at ${url}`);
    console.log(`Sending match data:`, JSON.stringify(matchData, null, 2));
    
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
    console.log(`✅ Successfully notified ${serviceName}`);
    console.log(`📥 ${serviceName} response:`, JSON.stringify(responseData, null, 2));
    console.log('-'.repeat(60));
    
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