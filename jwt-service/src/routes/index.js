import signRoute from "./sign.js";

export default async function registerRoutes(fastify) {
  fastify.register(signRoute);
}
