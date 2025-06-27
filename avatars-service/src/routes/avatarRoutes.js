import * as avatarControllers from "../controllers/avatarControllers.js";

export default async function avatarRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/avatars/id/:id",
    handler: avatarControllers.createAvatar,
  });

  fastify.route({
    method: "GET",
    url: "/avatars/id/:id",
    handler: avatarControllers.readAvatar,
  });

  fastify.route({
    method: "PUT",
    url: "/avatars/id/:id",
    handler: avatarControllers.updateAvatar,
  });

  fastify.route({
    method: "DELETE",
    url: "/avatars/id/:id",
    handler: avatarControllers.deleteAvatar,
  });
}
