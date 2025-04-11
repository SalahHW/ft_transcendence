import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { SECRETKEY } from "../config/config.js";

export default fp(async function (fastify, options) {
  fastify.register(jwt, { secret: SECRETKEY });
  fastify.decorate("authenticate", async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });
});
