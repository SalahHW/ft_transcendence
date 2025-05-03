import { getAllUsers, getUserById } from "../../controllers/users/readControllers.js";
import { createUser, readUser, updateUser, deleteUser } from "../../controllers/users/userControllers.js";

export default async function userRoutes(fastify, options) {
    fastify.route({
        method: "POST",
        url: "/users/:user",
        handler: createUser,
    });
    fastify.route({
        method: "GET",
        url: "/users/:user",
        handler: readUser,
    });
    fastify.route({
        method: "POST",
        url: "/users/:user",
        handler: updateUser,
    });
    fastify.route({
        method: "DELETE",
        url: "/users/:id",
        handler: deleteUser
    });
}

/*
fastify.route({
  method: "GET",
  url: "/users",
  handler: getAllUsers,
});
fastify.route({
  method: "GET",
  url: "/users/:id",
  handler: getUserById,
});
*/