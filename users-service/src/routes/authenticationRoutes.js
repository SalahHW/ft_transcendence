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
    preHandler: [fastify.verifyToken],
    handler: async (request, reply) => {
      return { user: request.user };
    },
  });
}
