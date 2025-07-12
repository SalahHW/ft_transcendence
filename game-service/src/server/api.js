import { setPlayerReady } from './gameState.js';
import { GAME_CONFIG, HTTP_STATUS } from '../core/constants.js';
import { ValidationUtils, LogUtils } from '../utils/helpers.js';
import { playerManager } from '../player/PlayerManager.js';
import { gameStateManager } from '../game/GameStateManager.js';
import { gameEngine } from '../game/GameEngine.js';
import { roomManager } from '../room/RoomManager.js';
import { tournamentManager } from '../tournament/TournamentManager.js';

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
  fastify.get('/api/players', async (request, reply) => {
    try {
      console.log('API request: GET /api/players');
      const playerList = playerManager.getPlayersSummary();
      return reply.code(HTTP_STATUS.OK).send({
        status: 'success',
        data: playerList,
        count: playerList.length,
      });
    } catch (error) {
      console.error('Error in /api/players:', error);
      return reply.code(500).send({
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
      return reply.code(201).send({
        status: 'success',
        data: { id: player.id, username: player.username },
      });
    } catch (error) {
      console.error('Error in POST /api/players:', error);
      const status = error.message.includes('Invalid username') ? HTTP_STATUS.BAD_REQUEST : 500;
      return reply.code(status).send({
        status: 'error',
        message: error.message || 'Internal server error',
      });
    }
  });

  // POST /api/tournaments: Create a new player for tournament with a username
  fastify.post('/api/tournaments', async (request, reply) => {
    try {
      console.log('🎯 TOURNAMENT BUTTON CLICKED: API request: POST /api/tournaments');
      const { username } = request.body || {};
      
      console.log(`🏆 Player ${username} clicked the tournament button!`);
      
      // Register player first
      const player = playerManager.registerPlayerWithUsername(username);
      
      // Add player to tournament waiting room
      let tournamentData;
      try {
        tournamentData = await tournamentManager.addPlayerToTournament(player.id, username);
      } catch (tournamentError) {
        console.error(`🏆 Error adding player ${username} to tournament:`, tournamentError);
        
        // ⭐ CRITICAL FIX: If tournament registration fails, try to clean up stale data and retry
        console.log(`🏆 Attempting to clean up stale tournament data and retry for player ${username}`);
        try {
          await tournamentManager.cleanupManager.cleanupStaleWaitingRoomData();
          
          // Retry tournament registration after cleanup
          tournamentData = await tournamentManager.addPlayerToTournament(player.id, username);
          console.log(`🏆 Tournament registration successful after cleanup for player ${username}`);
        } catch (retryError) {
          console.error(`🏆 Tournament registration failed even after cleanup for player ${username}:`, retryError);
          throw new Error(`Failed to join tournament after cleanup: ${retryError.message}`);
        }
      }
      
      console.log(`Created tournament player ${player.id} with username ${username}`);
      console.log(`🏆 Player ${username} added to tournament waiting room ${tournamentData.waitingRoomId} (${tournamentData.playerCount}/4)`);
      
              // Return WebSocket connection information for the client
        return reply.code(201).send({
          status: 'success',
          data: { 
            id: player.id, 
            username: player.username,
            waitingRoomId: tournamentData.waitingRoomId,
            playerCount: tournamentData.playerCount,
            maxPlayers: tournamentData.maxPlayers,
            websocketUrl: `/api/game/ws?playerId=${player.id}&roomId=${tournamentData.waitingRoomId}&matchType=tournament`
          },
        });
    } catch (error) {
      console.error('Error in POST /api/tournaments:', error);
      const status = error.message.includes('Invalid username') ? HTTP_STATUS.BAD_REQUEST : 500;
      return reply.code(status).send({
        status: 'error',
        message: error.message || 'Internal server error',
      });
    }
  });

  // GET /api/tournaments/waiting-rooms: Get all tournament waiting room information
  fastify.get('/api/tournaments/waiting-rooms', async (request, reply) => {
    try {
      console.log('API request: GET /api/tournaments/waiting-rooms');
      const waitingRoomCounts = tournamentManager.getAllWaitingRoomCounts();
      const stats = tournamentManager.getTournamentStats();
      
      return reply.code(HTTP_STATUS.OK).send({
        status: 'success',
        data: {
          waitingRooms: waitingRoomCounts,
          stats: stats
        },
      });
    } catch (error) {
      console.error('Error in GET /api/tournaments/waiting-rooms:', error);
      return reply.code(500).send({
        status: 'error',
        message: 'Internal server error',
      });
    }
  });

  // GET /api/tournaments/waiting-rooms/:id: Get specific tournament waiting room information
  fastify.get('/api/tournaments/waiting-rooms/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      console.log(`API request: GET /api/tournaments/waiting-rooms/${id}`);
      
      const waitingRoomData = tournamentManager.getWaitingRoomPlayerCount(id);
      if (!waitingRoomData) {
        return reply.code(404).send({
          status: 'error',
          message: 'Tournament waiting room not found',
        });
      }
      
      return reply.code(HTTP_STATUS.OK).send({
        status: 'success',
        data: waitingRoomData,
      });
    } catch (error) {
      console.error(`Error in GET /api/tournaments/waiting-rooms/${request.params.id}:`, error);
      return reply.code(500).send({
        status: 'error',
        message: 'Internal server error',
      });
    }
  });

  // DELETE /api/tournaments/players/:id: Remove player from tournament waiting room
  fastify.delete('/api/tournaments/players/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const { username } = request.body || {};
      
      console.log(`API request: DELETE /api/tournaments/players/${id} (username: ${username})`);
      
      if (!username) {
        return reply.code(HTTP_STATUS.BAD_REQUEST).send({
          status: 'error',
          message: 'Username is required in request body',
        });
      }
      
      const result = await tournamentManager.removePlayerFromTournament(id, username);
      
      if (result.success) {
        return reply.code(HTTP_STATUS.OK).send({
          status: 'success',
          data: result,
        });
      } else {
        return reply.code(404).send({
          status: 'error',
          message: result.message,
        });
      }
    } catch (error) {
      console.error(`Error in DELETE /api/tournaments/players/${request.params.id}:`, error);
      return reply.code(500).send({
        status: 'error',
        message: 'Internal server error',
      });
    }
  });

  // POST /api/tournaments/players/:id/leave: Explicitly leave tournament waiting room
  fastify.post('/api/tournaments/players/:id/leave', async (request, reply) => {
    try {
      const { id } = request.params;
      const { username } = request.body || {};
      
      console.log(`API request: POST /api/tournaments/players/${id}/leave (username: ${username})`);
      
      if (!username) {
        return reply.code(HTTP_STATUS.BAD_REQUEST).send({
          status: 'error',
          message: 'Username is required in request body',
        });
      }
      
      // Find which waiting room the player is in
      const waitingRoomCounts = tournamentManager.getAllWaitingRoomCounts();
      let foundRoom = null;
      
      for (const [waitingRoomId, data] of Object.entries(waitingRoomCounts)) {
        const player = data.players.find(p => p.id === id);
        if (player) {
          foundRoom = waitingRoomId;
          break;
        }
      }
      
      if (!foundRoom) {
        return reply.code(404).send({
          status: 'error',
          message: `Player ${username} not found in any tournament waiting room`,
        });
      }
      
      // Handle as explicit leave through disconnect handler
      const { disconnectionDetector } = await import('../server/disconnect/DisconnectionDetector.js');
      disconnectionDetector.handleExplicitLeave(id, foundRoom);
      
      return reply.code(HTTP_STATUS.OK).send({
        status: 'success',
        data: {
          message: `Player ${username} left tournament waiting room`,
          waitingRoomId: foundRoom
        },
      });
    } catch (error) {
      console.error(`Error in POST /api/tournaments/players/${request.params.id}/leave:`, error);
      return reply.code(500).send({
        status: 'error',
        message: 'Internal server error',
      });
    }
  });

  // POST /api/tournaments/players/:id/browser-event: Handle browser events for tournament waiting rooms
  fastify.post('/api/tournaments/players/:id/browser-event', async (request, reply) => {
    try {
      const { id } = request.params;
      const { username, eventType } = request.body || {};
      
      console.log(`API request: POST /api/tournaments/players/${id}/browser-event (username: ${username}, event: ${eventType})`);
      
      if (!username || !eventType) {
        return reply.code(HTTP_STATUS.BAD_REQUEST).send({
          status: 'error',
          message: 'Username and eventType are required in request body',
        });
      }
      
      // Find which waiting room the player is in
      const waitingRoomCounts = tournamentManager.getAllWaitingRoomCounts();
      let foundRoom = null;
      
      for (const [waitingRoomId, data] of Object.entries(waitingRoomCounts)) {
        const player = data.players.find(p => p.id === id);
        if (player) {
          foundRoom = waitingRoomId;
          break;
        }
      }
      
      if (!foundRoom) {
        return reply.code(404).send({
          status: 'error',
          message: `Player ${username} not found in any tournament waiting room`,
        });
      }
      
      // Handle browser event through disconnect handler
      const { disconnectionDetector } = await import('../server/disconnect/DisconnectionDetector.js');
      disconnectionDetector.handleBrowserEvent(id, foundRoom, eventType);
      
      return reply.code(HTTP_STATUS.OK).send({
        status: 'success',
        data: {
          message: `Browser event ${eventType} handled for player ${username}`,
          waitingRoomId: foundRoom
        },
      });
    } catch (error) {
      console.error(`Error in POST /api/tournaments/players/${request.params.id}/browser-event:`, error);
      return reply.code(500).send({
        status: 'error',
        message: 'Internal server error',
      });
    }
  });

  // POST /api/tournaments/players/:id/activity: Update player activity in tournament waiting room
  fastify.post('/api/tournaments/players/:id/activity', async (request, reply) => {
    try {
      const { id } = request.params;
      const { username } = request.body || {};
      
      console.log(`API request: POST /api/tournaments/players/${id}/activity (username: ${username})`);
      
      if (!username) {
        return reply.code(HTTP_STATUS.BAD_REQUEST).send({
          status: 'error',
          message: 'Username is required in request body',
        });
      }
      
      // Find which waiting room the player is in
      const waitingRoomCounts = tournamentManager.getAllWaitingRoomCounts();
      let foundRoom = null;
      
      for (const [waitingRoomId, data] of Object.entries(waitingRoomCounts)) {
        const player = data.players.find(p => p.id === id);
        if (player) {
          foundRoom = waitingRoomId;
          break;
        }
      }
      
      if (!foundRoom) {
        return reply.code(404).send({
          status: 'error',
          message: `Player ${username} not found in any tournament waiting room`,
        });
      }
      
      // Update player activity
      tournamentManager.updatePlayerActivity(id, foundRoom);
      
      return reply.code(HTTP_STATUS.OK).send({
        status: 'success',
        data: {
          message: `Activity updated for player ${username}`,
          waitingRoomId: foundRoom
        },
      });
    } catch (error) {
      console.error(`Error in POST /api/tournaments/players/${id}/activity:`, error);
      return reply.code(500).send({
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
      
      const isReady = playerManager.setPlayerReady(id);
      
      return reply.code(200).send({
        status: 'success',
        message: 'Player ready status updated',
        data: { playerId: id, isReady }
      });
    } catch (error) {
      console.error('Error in POST /api/players/:id/ready:', error);
      const status = error.message.includes('not found') ? 404 : 500;
      return reply.code(status).send({
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
    
    // ⭐ FIX: Allow paddle movement for API-registered players even without WebSocket
    // This enables CLI control via HTTP API as required by the assignment
    if (!player.username) {
      return { error: { status: 400, message: 'Player must have a username' } };
    }
    
    // Only require WebSocket connection for real-time game features
    // Paddle movement via HTTP API should work for CLI control
    return { player };
  };

  // POST /api/players/:id/paddle/up - Move paddle up
  fastify.post('/api/players/:id/paddle/up', async (request, reply) => {
    try {
      const { id } = request.params;
      const validation = validatePaddleRequest(id);
      
      if (validation.error) {
        return reply.code(validation.error.status).send({
          status: 'error',
          message: validation.error.message
        });
      }

      movePaddle(validation.player, 'up');
      
      return reply.code(200).send({
        status: 'success',
        message: 'Paddle moved up',
        data: { playerId: id, direction: 'up', roomId: validation.player.roomId }
      });
    } catch (error) {
      console.error('Error in POST /api/players/:id/paddle/up:', error);
      return reply.code(500).send({
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
        return reply.code(validation.error.status).send({
          status: 'error',
          message: validation.error.message
        });
      }

      movePaddle(validation.player, 'down');
      
      return reply.code(200).send({
        status: 'success',
        message: 'Paddle moved down',
        data: { playerId: id, direction: 'down', roomId: validation.player.roomId }
      });
    } catch (error) {
      console.error('Error in POST /api/players/:id/paddle/down:', error);
      return reply.code(500).send({
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
        return reply.code(400).send({
          status: 'error',
          message: `Missing required fields: ${missingFields.join(', ')}`,
        });
      }

      // Forward match data to other services
      await notifyOtherServices(matchData);
      
      return reply.code(200).send({
        status: 'success',
        message: 'Match results reported successfully',
        data: { matchId: matchData.roomId }
      });
    } catch (error) {
      console.error('Error in POST /api/matches/results:', error);
      return reply.code(500).send({
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
      url: process.env.USERS_SERVICE_URL || 'http://users:3000',
      endpoints: ['/api/matches/completed']
    }
    // ⭐ FIX: Removed stats-service as it's not defined in docker-compose
    // {
    //   name: 'stats-service', 
    //   url: process.env.STATS_SERVICE_URL || 'http://localhost:3002',
    //   endpoints: ['/api/player-stats', '/api/match-history']
    // }
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
    console.log(`📡 Notifying ${serviceName} at ${url}...`);
    
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
    
    return responseData;
  } catch (error) {
    // ⭐ FIX: Make API communication failures less noisy
    console.warn(`⚠️ Failed to notify ${serviceName}: ${error.message}`);
    // Don't throw error to prevent match processing from failing
    return null;
  }
}

// Export function to call external services from gameState
export async function reportMatchResultsToAPI(matchData) {
  try {
    // Forward match data to external services only
    const results = await notifyOtherServices(matchData);
    
    // Check if any notifications succeeded
    const successfulNotifications = results.filter(result => result !== null);
    if (successfulNotifications.length > 0) {
      console.log(`✅ Match results processing completed (${successfulNotifications.length} services notified)`);
    } else {
      console.warn('⚠️ Match results processing completed but no external services were notified');
    }
  } catch (error) {
    console.error('❌ Failed to process match results:', error.message);
  }
}