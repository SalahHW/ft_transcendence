import { createUser } from "./userControllers.js";
import { readUserByUsername } from "../models/userModels.js";
import { comparePassword } from "../utils/password.js";
import {
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
} from "../plugins/jwt.js";

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

    const accessToken = await signAccessToken({
      sub: user.id,
      username: user.username,
      aud: "users-service",
      type: "accessToken",
    });

    const refreshToken = await signRefreshToken({
      sub: user.id,
      username: user.username,
      aud: "users-service",
      type: "refreshToken",
    });

    setAuthCookies(reply, accessToken, refreshToken);

    return reply.code(200).send({ id: user.id, username: user.username });
  } catch (error) {
    return reply
      .code(500)
      .send({ error: "Login failed", cause: error.message });
  }
};

export const logoutUser = async (request, reply) => {
  reply
    .clearCookie("accessToken", {
      httpOnly: true,
      secure: "true",
      sameSite: "None",
      path: "/",
    })
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: "true",
      sameSite: "None",
      path: "/",
    })
    .code(200)
    .send({ message: "Logout successful" });
};
