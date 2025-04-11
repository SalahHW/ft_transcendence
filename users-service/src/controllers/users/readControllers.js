import {
  getAllUsers as fetchAllUsers,
  getUserById as fetchUserById,
} from "../../models/userModels/readModels.js";

export const getAllUsers = async (request, reply) => {
  try {
    const users = await fetchAllUsers();
    reply.statusCode = 200;
    return { users };
  } catch (err) {
    reply.statusCode = 500;
    return { error: "Failed to fetch users" };
  }
};

export const getUserById = async (request, reply) => {
  const userId = request.params.id;

  try {
    const user = await fetchUserById(userId);
    if (!user) {
      reply.statusCode = 404;
      return { error: "User not found" };
    }
    reply.statusCode = 200;
    return { user };
  } catch (err) {
    reply.statusCode = 500;
    return { error: "Failed to fetch user #", userId };
  }
};
