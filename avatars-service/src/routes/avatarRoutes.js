import * as avatarControllers from "../controllers/avatarControllers.js";

export default async function avatarRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/users_avatar/id/:id",
    preHandler: fastify.multipart,
    handler: avatarControllers.uploadAvatar,
  });
}
