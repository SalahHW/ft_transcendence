import * as userControllers from "../../controllers/users/userControllers.js";

export default async function userRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/users",
    handler: userControllers.createUser,
  });

  fastify.route({
    method: "GET",
    url: "/users/:id",
    handler: userControllers.readUser,
  });

  fastify.route({
    method: "PUT",
    url: "/users/:id",
    handler: userControllers.updateUser,
  });

  fastify.route({
    method: "DELETE",
    url: "/users/:id",
    handler: userControllers.deleteUser,
  });
}
