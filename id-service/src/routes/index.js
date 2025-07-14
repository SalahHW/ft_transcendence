import idRoutes from "./idRoutes.js";

export default async function registerRoutes(fastify, options) {
  fastify.register(idRoutes);
} 