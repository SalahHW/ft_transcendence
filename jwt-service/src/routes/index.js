import signRoute from "./sign.js";
import verifyRoute from "./verify.js";
import refreshRoute from "./refresh.js";

export default async function registerRoutes(fastify) {
  fastify.register(signRoute);
  fastify.register(verifyRoute);
  fastify.register(refreshRoute);
}
