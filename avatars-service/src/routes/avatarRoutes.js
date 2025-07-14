import * as avatarSchemas from "../schemas/avatarSchemas.js";
import * as avatarControllers from "../controllers/avatarControllers.js";
import * as jwtControllers from "../controllers/jwtControllers.js";

export default async function avatarRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/avatars",
    schema: avatarSchemas.uploadAvatar,
    preHandler: [jwtControllers.verifyAuthentication],
    handler: avatarControllers.createAvatar,
  });

  fastify.route({
    method: "GET",
    url: "/avatars/id/:id",
    schema: avatarSchemas.getAvatar,
    handler: avatarControllers.readAvatar,
  });

  fastify.route({
    method: "PUT",
    url: "/avatars",
    schema: avatarSchemas.updateAvatar,
    preHandler: [jwtControllers.verifyAuthentication],
    handler: avatarControllers.updateAvatar,
  });

  fastify.route({
    method: "DELETE",
    url: "/avatars",
    schema: avatarSchemas.deleteAvatar,
    preHandler: [jwtControllers.verifyAuthentication],
    handler: avatarControllers.deleteAvatar,
  });
}
