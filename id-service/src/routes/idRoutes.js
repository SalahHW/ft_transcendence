import * as idControllers from "../controllers/idControllers.js";

export default async function idRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/ids",
    schema: {
      summary: "Register a new ID",
      description: "Registers a new matchId or tournamentId. Only one ID type can be provided at a time.",
      body: {
        type: "object",
        oneOf: [
          {
            required: ["matchId"],
            properties: {
              matchId: { 
                type: "integer", 
                minimum: 0,
                description: "The match ID to register" 
              }
            }
          },
          {
            required: ["tournamentId"],
            properties: {
              tournamentId: { 
                type: "integer", 
                minimum: 0,
                description: "The tournament ID to register" 
              }
            }
          }
        ]
      },
      response: {
        201: {
          description: "ID registered successfully.",
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" }
          }
        },
        400: {
          description: "Bad request - invalid input.",
          type: "object",
          properties: {
            error: { type: "string" }
          }
        },
        409: {
          description: "Conflict - ID already exists.",
          type: "object",
          properties: {
            error: { type: "string" }
          }
        },
        500: {
          description: "Internal server error.",
          type: "object",
          properties: {
            error: { type: "string" }
          }
        }
      }
    },
    handler: idControllers.registerId,
  });
} 