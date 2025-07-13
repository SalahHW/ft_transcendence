import { signRefreshToken } from "../controllers/signRefreshToken.js";

export default async function signRefreshTokenRoute(fastify) {
  fastify.route({
    method: "POST",
    url: "/signRefreshToken",
    handler: signRefreshToken,
  });
}
