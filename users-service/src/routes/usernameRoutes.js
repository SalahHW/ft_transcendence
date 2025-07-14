import * as usernameControllers from "../controllers/usernameControllers.js";
import * as usernameSchema from "../schemas/usernameSchemas.js";
import * as meControllers from "../controllers/meControllers.js";
import { updateUsername } from "../schemas/usernameSchemas.js";

export default async function usernameRoutes(fastify) {
  fastify.route({
    method: "PUT",
    url: "/users/username",
    schema: updateUsername,
    preHandler: meControllers.verifyAuthentication,
    handler: usernameControllers.updateUsername,
  });
}
