import { setPlayerReady } from './gameState.js';

export async function registerApiRoutes(fastify, options) {
  const { players } = options;

  // GET /api/players: Return list of connected players with usernames
  fastify.get('/api/players', async (request, reply) => {
    try {
      console.log('API request: GET /api/players');
      const playerList = Array.from(players.values()).map(player => ({
        id: player.id,
        username: player.username || 'Anonymous',
        readyToPlay: player.readyToPlay || false
      }));
      return reply.status(200).send({
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
      if (typeof username !== 'string' || username.trim().length === 0 || username.trim().length > 20) {
        return reply.status(400).send({
          status: 'error',
          message: 'Invalid username: must be a string (1-20 characters)',
        });
      }
      const playerId = fastify.uuid();
      const player = {
        id: playerId,
        username: username.trim(),
        ws: null, // No WebSocket connection yet
        positionZ: 0,
        isUpPressed: false,
        isDownPressed: false,
        lastUpdate: Date.now(),
        playerScore: 0,
        readyToPlay: false
      };
      players.set(playerId, player);
      console.log(`Created player ${playerId} with username ${username}`);
      return reply.status(201).send({
        status: 'success',
        data: { id: playerId, username: player.username },
      });
    } catch (error) {
      console.error('Error in POST /api/players:', error);
      return reply.status(500).send({
        status: 'error',
        message: 'Internal server error',
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
      const player = players.get(id);
      
      if (!player) {
        return reply.status(404).send({
          status: 'error',
          message: 'Player not found',
        });
      }

      setPlayerReady(id);
      
      return reply.status(200).send({
        status: 'success',
        message: 'Player ready status updated',
      });
    } catch (error) {
      console.error('Error in POST /api/players/:id/ready:', error);
      return reply.status(500).send({
        status: 'error',
        message: 'Internal server error',
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
    console.log(`🔄 Notifying ${serviceName} at ${url}`);
    console.log(`📤 Sending match data:`, JSON.stringify(matchData, null, 2));
    
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

// Export function to call the internal API from gameState
export async function reportMatchResultsToAPI(matchData) {
  try {
    const API_BASE_URL = process.env.GAME_SERVICE_API_BASE || 'https://localhost:8080';
    
    const response = await fetch(`${API_BASE_URL}/api/matches/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(matchData),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    console.log('Match results successfully reported to API');
    return await response.json();
  } catch (error) {
    console.error('Failed to report match results to API:', error);
    // Don't throw - we don't want to break the game flow if API call fails
  }
}