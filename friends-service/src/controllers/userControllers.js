import * as userServices from "../services/userServices.js";

export async function verifyTargetUserExists(request, reply) {
  const userId = request.params.friendId;

  let response;
  try {
    response = await userServices.userExists(userId);
  } catch (err) {
    if (err.status === 404) {
      return reply.code(404).send({ error: "User not found" });
    }
    return reply.code(503).send({
      error: "Users service temporarily unavailable",
    });
  }

  if (!response.ok) {
    return reply.code(404).send({ error: "User not found" });
  }
}
