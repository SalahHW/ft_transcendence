import { signRefreshToken } from "../controllers/signRefreshToken.js";

export default async function refreshRoute(fastify) {
  fastify.route({
    method: "POST",
    url: "/refresh",
    handler: signRefreshToken,
  });
}
