import * as emailControllers from "../controllers/emailControllers.js";
import * as emailSchemas from "../schemas/emailSchema.js";
import * as meControllers from "../controllers/meControllers.js";

export default async function emailRoutes(fastify) {
  fastify.route({
    method: "PUT",
    url: "/users/email",
    schema: emailSchemas.updateEmail,
    preHandler: meControllers.verifyAuthentication,
    handler: emailControllers.updateEmail,
  });
}
