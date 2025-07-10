import { refreshToken } from "../controllers/refresh.js";

export default async function refreshRoute(fastify) {
  fastify.route({
    method: "POST",
    url: "/refresh",
    handler: refreshToken,
  });
}
