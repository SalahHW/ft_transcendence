import signAccessTokenRoute from "./signAccessToken.js";
import verifyRoute from "./verify.js";
import signRefreshTokenRoute from "./signRefreshToken.js";

export default async function registerRoutes(fastify) {
  fastify.register(signAccessTokenRoute);
  fastify.register(verifyRoute);
  fastify.register(signRefreshTokenRoute);
}
