import * as presencesMethodes from "../methodes/presencesMethodes.js";

export default async function presencesRoutes(fastify) {
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
    method: "DELETE",
    url: "/avatars/id/:id",
    handler: avatarControllers.deleteAvatar,
  });
}
