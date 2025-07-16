import { verifyToken } from "../controllers/verify.js";
import { checkBlacklistedTokens } from "../controllers/redisControllers.js";

export default async function verifyRoute(fastify) {
  fastify.route({
    method: "POST",
    url: "/verify",
    preHandler: checkBlacklistedTokens,
    handler: verifyToken,
  });
}
