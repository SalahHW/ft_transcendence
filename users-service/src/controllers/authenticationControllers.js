import { createUser } from "./users/userControllers.js";
import { readUserByUsername } from "../models/userModels/userModels.js";
import { comparePassword } from "../utils/password.js";

export const registerUser = async (request, reply) => {
  return createUser(request, reply);
};

export const loginUser = async (request, reply) => {
  const { username, password } = request.body;

  if (!username || !password) {
    reply.statusCode = 401;
    reply.send({ error: "Username and password are required" });
    return;
  }

  try {
    const user = await readUserByUsername(username);
    const isValidPass = comparePassword(password, user.password);
    if (!isValidPass) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const token = request.server.signToken({
      sub: user.id,
      username: user.username,
      aud: "users-service",
    });

    reply.code(200).send(token);
  } catch (error) {
    return reply
      .code(500)
      .send({ error: "Login failed", cause: error.message });
  }
};
