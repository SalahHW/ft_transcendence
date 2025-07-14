import * as usernameControllers from "../controllers/usernameControllers.js";
import * as usernameSchemas from "../schemas/usernameSchemas.js";
import * as meControllers from "../controllers/meControllers.js";

export default async function usernameRoutes(fastify) {
  fastify.route({
    method: "PUT",
    url: "/users/username",
    schema: usernameSchemas.updateUsername,
    preHandler: meControllers.verifyAuthentication,
    handler: usernameControllers.updateUsername,
  });
}
