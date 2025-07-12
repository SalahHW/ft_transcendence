import userRoutes from "./userRoutes.js";
import authenticationRoutes from "./authenticationRoutes.js";
import walletAuthenticationRoutes from "./walletAuthenticationRoutes.js";
import emailRoutes from "./emailRoutes.js";

export default async function registerRoutes(fastify, options) {
  fastify.register(userRoutes);
  fastify.register(authenticationRoutes);
  fastify.register(walletAuthenticationRoutes);
  fastify.register(emailRoutes);
}
