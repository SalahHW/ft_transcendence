import { loginUser } from "../../controllers/auth/login.js";

export default async function loginRoutes(fastify, options) {
  fastify.route({
    method: "POST",
    url: "/login",
    handler: loginUser,
  });
}
