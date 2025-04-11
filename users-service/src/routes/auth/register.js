import { createUser } from "../../controllers/auth/register.js";

export default async function registerUsersRoutes(fastify, options) {
  fastify.route({
    method: "POST",
    url: "/register",
    handler: createUser,
  });
}
