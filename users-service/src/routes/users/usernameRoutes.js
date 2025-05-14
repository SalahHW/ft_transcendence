import { createUsername, readUsername, updateUsername } from "../../controllers/users/usernameControllers.js";

export default async function usernameRoutes(fastify, options) {
    fastify.route({
        method: "POST",
        url: "/users/:username",
        handler: createUsername,
    });
    fastify.route({
        method: "GET",
        url: "/users/:username",
        handler: readUsername,
    });
    fastify.route({
        method: "POST",
        url: "/users/:username",
        handler: updateUsername
    });
  }