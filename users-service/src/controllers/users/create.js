import { insertUser } from "../../models/userModels/create.js";

export const createUser = async (request, reply) => {
  const { username, password } = request.body;

  try {
    const newUser = await insertUser(username, password);
    reply.statuscode = 201;
    //TODO: Update with new columns
    return { id: newUser.id, username: newUser.username };
  } catch (err) {
    reply.statuscode = 500;
    return { error: "Failed to create user" };
  }
};
