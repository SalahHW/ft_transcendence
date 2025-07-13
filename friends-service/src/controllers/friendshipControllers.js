import * as friendshipModels from "../models/friendshipModels.js";
import * as userServices from "../services/userServices.js";
import { sendControllerError } from "./errors/controllerErrorHandler.js";

export async function createFriendship(request, reply) {
  try {
    const friendId = request.params.friendId;

    console.log("hello", friendId);

    // if (userId === friendId) {
    //   return reply
    //     .code(400)
    //     .send({ error: "User cannot add themselves as a friend" });
    // }

    // await userServices.userExists(userId);
    // await userServices.userExists(friendId);

    // await friendshipModels.createFriendship(userId, friendId);
    // return reply.code(201).send({ message: "Friendship created" });
  } catch (err) {
    return sendControllerError(reply, err);
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
