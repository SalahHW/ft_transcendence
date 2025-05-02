import { verifyToken } from "../controllers/verify.js";

export default async function verifyRoute(fastify) {
  fastify.route({
    method: "POST",
    url: "/verify",
    handler: verifyToken,
  });
}
