import { getAllUsers, getUserById } from "../../controllers/users/read.js";

export default async function userRoutes(fastify, options) {
  fastify.route({
    method: "GET",
    url: "/users",
    handler: getAllUsers,
  });
  fastify.route({
    method: "GET",
    url: "/users/:id",
    handler: getUserById,
  });
}
