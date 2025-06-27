import friendshipRoutes from "./friendshipRoutes.js";

export default async function registerRoutes(fastify) {
  fastify.register(friendshipRoutes);
}
