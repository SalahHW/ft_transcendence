import { signToken } from "../controllers/sign.js";

export default async function signRoute(fastify) {
  fastify.route({
    method: "POST",
    url: "/sign",
    handler: signToken,
  });
}
