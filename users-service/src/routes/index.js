import getUsersRoutes from './users/getUsers.js';
import postUsersRoutes from './users/postUsers.js';

export default async function registerRoutes(fastify, options) {
  fastify.register(getUsersRoutes);
  fastify.register(postUsersRoutes);
}