import { getUsers } from "../../controllers/users.js";

export default async function userRoutes(fastify, options) {
  fastify.route({
    method: 'GET',
    url: '/',
    handler: getUsers
  });
};