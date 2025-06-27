import * as passwordModels from "../models/passwordModels.js";
import { readUser } from "./userControllers.js";
import { encryptPassword, comparePassword } from "../utils/password.js";

export async function createPassword(password) {
  const regexPattern = /^[a-zA-Z0-9?!.#*"']{6,12}$/;
  if (!password || !regexPattern.test(password)) {
    throw new Error(
      "Invalid password format. It must be 6 to 12 characters long and contain only letters, numbers, or special characters"
    );
  }
  return await encryptPassword(password);
}

export async function readPassword(request, reply) {
  const userId = request.params.id;

  if (!userId) {
    return reply.code(400).send({ error: "UserId required" });
  }
  try {
    const password = await passwordModels.readPassword(userId);
    return reply.code(200).send(password);
  } catch (error) {
    return reply.code(500).send({
      error: "Failed to read the password",
      cause: error.message,
    });
  }
}

export async function updatePassword(request, reply) {
  const { oldPassword, newPassword } = request.body;
  const userId = request.params.id;

  if (!oldPassword || !newPassword) {
    return reply.code(400).send({ error: "Old and new password are required" });
  }
  const passwordCompare = await comparePassword(
    oldPassword,
    readUser().password
  );
  if (!passwordCompare) {
    return reply.code(401).send({ error: "Password doesn't match" });
  }
  try {
    const newHashedPassword = await encryptPassword(newPassword);
    const result = await passwordModels.updatePassword(
      userId,
      newHashedPassword
    );
    return reply.code(200).send(result);
  } catch (error) {
    return reply.code(500).send({
      error: "Failed to update the password",
      cause: error.message,
    });
  }
}
