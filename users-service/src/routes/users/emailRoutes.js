import { createEmail, readEmail, updateEmail } from "../../controllers/users/emailControllers.js";

export default async function emailRoutes(fastify, options) {
    fastify.route({
        method: "POST",
        url: "/users/:email",
        handler: createEmail,
    });
    fastify.route({
        method: "GET",
        url: "/users/:email",
        handler: readEmail,
    });
    fastify.route({
        method: "POST",
        url: "/users/:email",
        handler: updateEmail
    });
}