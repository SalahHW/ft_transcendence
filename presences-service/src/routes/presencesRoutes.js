import * as presencesMethodes from "../methodes/presencesMethodes.js";

export default async function presencesRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/presences/id/:id",
    handler: presencesMethodes.addOnlineUser,
  });

  fastify.route({
    method: "GET",
    url: "/presences/id/:id",
    handler: presencesMethodes.getOnlineUsers,
  });

  fastify.route({
    method: "DELETE",
    url: "/presences/id/:id",
    handler: presencesMethodes.removeOnlineUser,
  });
}
