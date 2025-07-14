import * as friendshipModels from "../models/friendshipModels.js";

export async function createFriendship(request, reply) {
  const friendId = request.params.friendId;
  const userId = request.user.sub;

  if (userId === friendId) {
    return reply
      .code(400)
      .send({ error: "User cannot add themselves as a friend" });
  }
  try {
    await friendshipModels.createFriendship(userId, friendId);
    return reply.code(201).send({ message: "Friendship created" });
  } catch (err) {
    if (err.message && err.message.includes("already exists")) {
      return reply.code(200).send({ message: "Friendship unchanged" });
    }
    return reply.code(500).send({
      error: "Failed to create friendships",
    });
  }
}

export async function readFriendship(request, reply) {
  try {
    const userId = request.params.userId;

    const friendships = await friendshipModels.readFriendship(userId);

    if (friendships.length === 0) {
      return reply.code(404).send({
        message: "No friendships found",
      });
    }

    return reply.code(200).send(friendships);
  } catch (err) {
    return reply.code(500).send({
      error: "Failed to read friendships",
      cause: err.message,
    });
  }
}

export async function deleteFriendship(request, reply) {
  try {
    const userId = request.params.userId;
    const friendId = request.params.friendId;

    if (userId === friendId) {
      return reply
        .code(400)
        .send({ error: "User cannot add themselves as a friend" });
    }

    await friendshipModels.deleteFriendship(userId, friendId);
    reply.code(204).send();
  } catch (err) {
    return reply.code(500).send({
      error: "Failed to delete friendships",
      cause: err.message,
    });
  }
}
