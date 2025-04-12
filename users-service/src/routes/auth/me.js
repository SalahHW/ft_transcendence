export default async function meRoute(fastify, options) {
  fastify.route({
    method: "GET",
    url: "/me",
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      return { user: request.user };
    },
  });
}
