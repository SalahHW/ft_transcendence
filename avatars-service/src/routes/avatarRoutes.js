import * as avatarControllers from "../controllers/avatarControllers.js";

export default async function avatarRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/avatars/id/:id",
    // preHandler: fastify.multipart,
    handler: avatarControllers.uploadAvatar,
  });
}
