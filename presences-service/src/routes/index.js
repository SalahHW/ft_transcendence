import presencesRoutes from "./presencesRoutes.js";

export default async function registerRoutes(fastify, options) {
  fastify.register(presencesRoutes);
}
