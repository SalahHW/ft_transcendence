import { signAccessToken } from "../controllers/signAccessToken.js";

export default async function signAccessTokenRoute(fastify) {
  fastify.route({
    method: "POST",
    url: "/signAccessToken",
    handler: signAccessToken,
  });
}
