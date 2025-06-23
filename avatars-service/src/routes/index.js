import avatarRoutes from "./avatarRoutes.js";

export default async function registerRoutes(fastify, options) {
  fastify.register(avatarRoutes);
}
