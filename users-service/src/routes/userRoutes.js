import * as userControllers from "../controllers/userControllers.js";
import * as userSchemas from "../schemas/userSchemas.js";
import * as meControllers from "../controllers/meControllers.js";
import { refreshAccessToken } from "../controllers/refreshAccessTokenController.js";

export default async function userRoutes(fastify) {
  // fastify.route({
  //   method: "POST",
  //   url: "/users",
  //   schema: userSchemas.createUser,
  //   handler: userControllers.createUser,
  // });

  fastify.route({
    method: "GET",
    url: "/users",
    schema: userSchemas.readAllUsers,
    handler: userControllers.readAllUsers,
  });

  fastify.route({
    method: "GET",
    url: "/users/id/:id",
    schema: userSchemas.readUser,
    handler: userControllers.readUser,
  });

  fastify.route({
    method: "GET",
    url: "/users/username/:username",
    schema: userSchemas.readUserByUsername,
    handler: userControllers.readUserByUsername,
  });

  fastify.route({
    method: "GET",
    url: "/users/wallet/:wallet",
    schema: userSchemas.readUserByWallet,
    handler: userControllers.readUserByWallet,
  });

  // fastify.route({
  //   method: "PUT",
  //   url: "/users/:id",
  //   schema: userSchemas.updateUser,
  //   handler: userControllers.updateUser,
  // });

  // fastify.route({
  //   method: "DELETE",
  //   url: "/users/:id",
  //   schema: userSchemas.deleteUser,
  //   handler: userControllers.deleteUser,
  // });

  fastify.route({
    method: "POST",
    url: "/refreshAccessToken",
    handler: refreshAccessToken,
  });
}
