import * as userControllers from "../controllers/userControllers.js";

export default async function userRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/users",
    schema: {
      summary: "Create a new user",
      description: "Creates a new user with a unique username and email.",
      body: {
        type: "object",
        required: ["username", "password", "email"],
        properties: {
          username: { type: "string", description: "The user's username." },
          password: { type: "string", description: "The user's password." },
          email: { type: "string", format: "email", description: "The user's email address." },
        },
      },
      response: {
        201: {
          description: "User successfully created.",
          type: "object",
          properties: {
            id: { type: "number" },
            username: { type: "string" },
            email: { type: "string" },
          },
        },
        409: {
          description: "Conflict: Username or email already exists.",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    handler: userControllers.createUser,
  });

  fastify.route({
    method: "GET",
    url: "/users",
    schema: {
      summary: "Get all users",
      description: "Returns a list of all users.",
      response: {
        200: {
          description: "List of users.",
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "number" },
              username: { type: "string" },
              email: { type: "string" },
            },
          },
        },
      },
    },
    handler: userControllers.readAllUsers,
  });

  fastify.route({
    method: "GET",
    url: "/users/id/:id",
    schema: {
      summary: "Get user by ID",
      description: "Returns a user by their unique ID.",
      params: {
        type: "object",
        properties: {
          id: { type: "number", description: "User's unique ID." },
        },
        required: ["id"],
      },
      response: {
        200: {
          description: "User found.",
          type: "object",
          properties: {
            id: { type: "number" },
            username: { type: "string" },
            email: { type: "string" },
          },
        },
        404: {
          description: "User not found.",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    handler: userControllers.readUser,
  });

  fastify.route({
    method: "GET",
    url: "/users/username/:username",
    schema: {
      summary: "Get user by username",
      description: "Returns a user by their username.",
      params: {
        type: "object",
        properties: {
          username: { type: "string", description: "User's username." },
        },
        required: ["username"],
      },
      response: {
        200: {
          description: "User found.",
          type: "object",
          properties: {
            id: { type: "number" },
            username: { type: "string" },
            email: { type: "string" },
          },
        },
        404: {
          description: "User not found.",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    handler: userControllers.readUserByUsername,
  });

  fastify.route({
    method: "PUT",
    url: "/users/:id",
    schema: {
      summary: "Update a user",
      description: "Updates a user's information by their unique ID.",
      params: {
        type: "object",
        properties: {
          id: { type: "number", description: "User's unique ID." },
        },
        required: ["id"],
      },
      body: {
        type: "object",
        properties: {
          username: { type: "string" },
          password: { type: "string" },
          email: { type: "string", format: "email" },
        },
      },
      response: {
        200: {
          description: "User updated successfully.",
          type: "object",
          properties: {
            id: { type: "number" },
            username: { type: "string" },
            email: { type: "string" },
          },
        },
        404: {
          description: "User not found.",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    handler: userControllers.updateUser,
  });

  fastify.route({
    method: "DELETE",
    url: "/users/:id",
    schema: {
      summary: "Delete a user",
      description: "Deletes a user by their unique ID.",
      params: {
        type: "object",
        properties: {
          id: { type: "number", description: "User's unique ID." },
        },
        required: ["id"],
      },
      response: {
        204: {
          description: "User deleted successfully. No content returned.",
          type: "null"
        },
        404: {
          description: "User not found.",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    handler: userControllers.deleteUser,
  });
}
