import getUsersRoutes from "./users/read.js";
import postUsersRoutes from "./users/create.js";

export default async function registerRoutes(fastify, options) {
  fastify.register(getUsersRoutes);
  fastify.register(postUsersRoutes);
}
