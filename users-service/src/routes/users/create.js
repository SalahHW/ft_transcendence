import { createUser } from "../../controllers/users/create.js";

export default async function postUsersRoutes(fastify, options) {
  fastify.route({
    method: "POST",
    url: "/users",
    handler: createUser,
  });
}
