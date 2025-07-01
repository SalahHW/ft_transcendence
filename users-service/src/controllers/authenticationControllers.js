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

    reply
      .setCookie("token", token, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        secure: false, // TODO: Update .env to set production mode
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24, // 1 day
      })
      .code(200)
      .send({ message: "Login successful" });
  } catch (error) {
    return reply
      .code(500)
      .send({ error: "Login failed", cause: error.message });
  }
};

export const logoutUser = async (request, reply) => {
  reply
    .clearCookie("token", {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
      secure: false, // TODO: Update .env to set production mode
      sameSite: "strict",
      path: "/",
    })
    .code(200)
    .send({ message: "Logout successful" });
};