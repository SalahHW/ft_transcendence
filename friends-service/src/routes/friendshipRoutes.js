import * as friendshipControllers from "../controllers/friendshipControllers.js";

export default async function friendshipRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/friends/:userId/:friendId",
    handler: friendshipControllers.createFriendship,
  });

  fastify.route({
    method: "GET",
    url: "/friends/:userId",
    handler: friendshipControllers.readFriendship,
  });

  fastify.route({
    method: "DELETE",
    url: "/friends/:userId/:friendId",
    handler: friendshipControllers.deleteFriendship,
  });
}
