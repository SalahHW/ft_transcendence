import * as avatarControllers from "../controllers/avatarControllers.js";

export default async function avatarRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/avatars/id/:id",
    // preHandler: fastify.multipart,
    handler: avatarControllers.createAvatar,
  });

  fastify.route({
    method: "GET",
    url: "/avatars/id/:id",
    handler: avatarControllers.readAvatar,
  });
}
