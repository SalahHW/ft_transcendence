import * as authenticationControllers from "../controllers/authenticationControllers.js";
import * as meControllers from "../controllers/meControllers.js";

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

  fastify.route({
    method: "POST",
    url: "/logout",
    preHandler: meControllers.verifyAuthentication,
    handler: authenticationControllers.logoutUser,
  });

  fastify.route({
    method: "GET",
    url: "/me",
    handler: meControllers.getMe,
  });
}
