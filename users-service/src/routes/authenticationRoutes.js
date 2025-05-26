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
        return reply
          .code(401)
          .send({ error: "Authentication token is missing" });
      }

      const verificationResult = await request.server.verifyToken(token);
      if (!verificationResult.valid) {
        return reply.code(401).send({ error: verificationResult.error });
      }

      return { user: verificationResult.decoded };
    },
  });
}
