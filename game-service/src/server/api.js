export async function registerApiRoutes(fastify, options) {
  const { players } = options; // Access shared players Map

  // GET /api/players: Return list of connected players with usernames
  fastify.get('/api/players', async (request, reply) => {
    try {
      console.log('API request: GET /api/players');
      const playerList = Array.from(players.values()).map(player => ({
        id: player.id,
        username: player.username || 'Anonymous', // Default if not set
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
}