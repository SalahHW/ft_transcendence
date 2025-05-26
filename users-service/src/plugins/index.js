import fp from "fastify-plugin";
import { signToken, verifyToken } from "./jwt.js";

export default fp(async function (fastify, options) {
  fastify.decorate("signToken", signToken);
  fastify.decorate("verifyToken", verifyToken);
});