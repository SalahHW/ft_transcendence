import * as authenticationControllers from "../controllers/authenticationControllers.js";

export default async function authenticationRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/register",
    handler: authenticationControllers.registerUser,
  });

  fastify.route({
    method: "POST",
    url: "/login",
    handler: authenticationControllers.loginUser,
  });

  fastify.route({
    method: "GET",
    url: "/me",
    handler: async (request, reply) => {
      const token = request.cookies?.token;
      if (!token) {
        return reply.code(401).send({ error: "Authentication token is missing" });
      }

      try {
        const user = await request.server.verifyToken(token);
        return { user };
      } catch (error) {
        return reply.code(401).send({ error: "Invalid token", cause: error.message });
      }
    },
  });
}
