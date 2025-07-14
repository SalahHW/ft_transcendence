import fp from "fastify-plugin";
import * as jwtPlugin from "./jwt.js";

export default fp(async function (fastify, options) {
  fastify.decorate("signAccessToken", jwtPlugin.signAccessToken);
  fastify.decorate("signRefreshToken", jwtPlugin.signRefreshToken);
  fastify.decorate("verifyToken", jwtPlugin.verifyToken);
  fastify.decorate("setAuthCookies", jwtPlugin.setAuthCookies);
});
