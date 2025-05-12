import * as authenticationControllers from "../controllers/authenticationControllers.js";

export default async function authenticationRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/register",
    handler: authenticationControllers.registerUser,
  });

  fastify.route({
    method: "POST",
    url: "/login",
    handler: authenticationControllers.loginUser,
  });
}
