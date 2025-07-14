import * as friendshipSchemas from "../schemas/friendshipSchemas.js";
import * as friendshipControllers from "../controllers/friendshipControllers.js";
import * as jwtControllers from "../controllers/jwtControllers.js";
import * as userControllers from "../controllers/userControllers.js";

export default async function friendshipRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/friends/id/:friendId",
    schema: friendshipSchemas.createFriendship,
    preHandler: [
      jwtControllers.verifyAuthentication,
      userControllers.verifyTargetUserExists
    ],
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
