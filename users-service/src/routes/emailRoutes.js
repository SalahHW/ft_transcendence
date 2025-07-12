import * as emailControllers from "../controllers/emailControllers.js";

export default async function emailRoutes(fastify) {
  fastify.route({
    method: "PUT",
    url: "/users/email",
    schema: {
      body: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" }
        }
      }
    },
    handler: emailControllers.updateEmail
  })
}