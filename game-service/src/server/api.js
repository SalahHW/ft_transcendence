//export async function registerApiRoutes(fastify, options) {
//  const { players } = options; // Access shared players Map
//
//  // GET /api/players: Return list of connected players with usernames
//  fastify.get('/api/players', async (request, reply) => {
//    try {
//      console.log('API request: GET /api/players');
//      const playerList = Array.from(players.values()).map(player => ({
//        id: player.id,
//        username: player.username || 'Anonymous', // Default if not set
//      }));
//      return reply.status(200).send({
//        status: 'success',
//        data: playerList,
//        count: playerList.length,
//      });
//    } catch (error) {
//      console.error('Error in /api/players:', error);
//      return reply.status(500).send({
//        status: 'error',
//        message: 'Internal server error',
//      });
//    }
//  });
//}

export async function registerApiRoutes(fastify, options) {
  const { players } = options;

  // GET /api/players: Return list of connected players with usernames
  fastify.get('/api/players', async (request, reply) => {
    try {
      console.log('API request: GET /api/players');
      const playerList = Array.from(players.values()).map(player => ({
        id: player.id,
        username: player.username || 'Anonymous',
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
}