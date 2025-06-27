import * as friendshipModels from "../models/friendshipModels.js";
import * as userServices from "../services/userServices.js";
import { sendControllerError } from "./errors/controllerErrorHandler.js";

export async function createFriendship(request, reply) {
  try {
    const userId = request.params.userId;
    const friendId = request.params.friendId;

    if (userId === friendId) {
      return reply
        .code(400)
        .send({ error: "User cannot add themselves as a friend" });
    }

    await userServices.userExists(userId);
    await userServices.userExists(friendId);

    await friendshipModels.createFriendship(userId, friendId);
    return reply.code(201).send({ message: "Friendship created" });
  } catch (err) {
    return sendControllerError(reply, err);
  }
}
