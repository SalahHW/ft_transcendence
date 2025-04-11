import getUsersRoutes from "./users/readRoutes.js";
import postUsersRoutes from "./users/createRoutes.js";

export default async function registerRoutes(fastify, options) {
  fastify.register(getUsersRoutes);
  fastify.register(postUsersRoutes);
}
