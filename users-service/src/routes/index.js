import getUsersRoutes from "./users/readRoutes.js";
import registerUsersRoutes from "./auth/register.js";
import loginRoutes from "./auth/login.js";
import meRoute from "./auth/me.js";

export default async function registerRoutes(fastify, options) {
  fastify.register(getUsersRoutes);
  fastify.register(registerUsersRoutes);
  fastify.register(loginRoutes);
  fastify.register(meRoute);
}
