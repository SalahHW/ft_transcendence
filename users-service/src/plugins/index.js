import fp from "fastify-plugin";
import * as jwtPlugin from "./jwt.js";

export default fp(async function (fastify, options) {
  fastify.decorate("signToken", jwtPlugin.signToken);
  fastify.decorate("verifyToken", jwtPlugin.verifyToken);
});
