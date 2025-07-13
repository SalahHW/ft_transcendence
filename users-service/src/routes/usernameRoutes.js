import * as usernameControllers from "../controllers/usernameControllers.js";
import * as meControllers from "../controllers/meControllers.js";

export default async function usernameRoutes(fastify) {
  fastify.route({
    method: "PUT",
    url: "/users/username",
    schema: {
      body: {
        type: "object",
        required: ["username"],
        properties: {
          username: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    preHandler: meControllers.verifyAuthentication,
    handler: usernameControllers.updateUsername,
  });
}