import { createUser } from "./userControllers.js";
import { readUserByUsername } from "../models/userModels.js";
import { comparePassword } from "../utils/password.js";

export const registerUser = async (request, reply) => {
  return createUser(request, reply);
};

export const loginUser = async (request, reply) => {
  const { username, password } = request.body;

  if (!username || !password)
    return reply
      .code(401)
      .send({ error: "Username and password are required" });

  try {
    const user = await readUserByUsername(username);
    if (!user) {
      return reply.code(401).send({ error: "Invalid username" });
    }
    
    const isValidPass = await comparePassword(password, user.password);
    if (!isValidPass) {
      return reply.code(401).send({ error: "Invalid password" });
    }

    const token = await request.server.signToken({
      sub: user.id,
      username: user.username,
      aud: "users-service",
    });
    reply.code(200).send({ token });
  } catch (error) {
    return reply
      .code(500)
      .send({ error: "Login failed", cause: error.message });
  }
};
