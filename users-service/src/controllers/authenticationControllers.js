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

    const accessToken = await request.server.signToken({
      sub: user.id,
      username: user.username,
      aud: "users-service",
      exp: "5m",
      type: "access",
    });

    const refreshToken = await request.server.signRefreshToken({
      sub: user.id,
      username: user.username,
      aud: "users-service",
      exp: "7d",
      type: "refresh",
    });
    request.server.setAuthCookies(reply, accessToken, refreshToken);

    return reply.code(200).send({ id: user.id, username: user.username });
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
