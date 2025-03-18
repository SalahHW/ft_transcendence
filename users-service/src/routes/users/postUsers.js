import { createUser } from "../../controllers/users.js";

export default async function postUsersRoutes(fastify, options) {
  fastify.route({
    method: 'POST',
    url: '/',
    handler: createUser
  });
}