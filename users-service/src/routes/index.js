import userRoutes from "./userRoutes.js";
import authenticationRoutes from "./authenticationRoutes.js";

export default async function registerRoutes(fastify, options) {
  fastify.register(userRoutes);
  fastify.register(authenticationRoutes);
}
