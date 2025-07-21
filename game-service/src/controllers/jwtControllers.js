import * as jwtServices from "../services/jwtServices.js";
import { playerManager } from "../player/PlayerManager.js";

export async function verifyAuthentication(request, reply) {
  const token = request.cookies?.accessToken;

  if (!token) {
    return reply.code(401).send({ error: "Authentication token is missing" });
  }

  let response;
  try {
    response = await jwtServices.verifyToken(token);
  } catch (err) {
    return reply.code(503).send({
      error: "Authentication service temporarily unavailable",
    });
  }

  if (!response.ok) {
    return reply.code(401).send({ error: "Invalid or expired token" });
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    console.error("Invalid JSON response from JWT service:", err);
    return reply
      .code(502)
      .send({ error: "Invalid response from authentication service" });
  }

  if (!data.decoded) {
    return reply
      .code(502)
      .send({ error: "Invalid user data from authentication service" });
  }

  request.user = data.decoded;
}

export async function verifyPlayerOwnership(request, reply) {
  const { id } = request.params;
  const userId = request.user?.sub;
  
  if (!userId) {
    return reply.code(401).send({ error: "User not authenticated" });
  }

  // Get player and verify ownership
  const player = playerManager.getPlayer(id);
  if (!player) {
    return reply.code(404).send({ error: "Player not found" });
  }

  if (player.userId !== userId) {
    return reply.code(403).send({ error: "Access denied: not your player" });
  }

  // Add player to request for later use
  request.player = player;
}

export async function verifyTournamentPlayerOwnership(request, reply) {
  const { id } = request.params;
  const userId = request.user?.sub;
  const { username } = request.body || {};
  
  if (!userId) {
    return reply.code(401).send({ error: "User not authenticated" });
  }

  if (!username) {
    return reply.code(400).send({ error: "Username is required in request body" });
  }

  // Get player and verify ownership
  const player = playerManager.getPlayer(id);
  if (!player) {
    return reply.code(404).send({ error: "Player not found" });
  }

  if (player.userId !== userId || player.username !== username) {
    return reply.code(403).send({ error: "Access denied: not your player" });
  }

  // Add player to request for later use
  request.player = player;
} 