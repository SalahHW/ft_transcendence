import * as avatarModels from "../models/avatarModels.js";
import { deleteFile } from "../utils/fileUtils.js";
import path from "path";
import fs from "fs";
import { AVATARS_PATH } from "../config/config.js";

export async function createAvatar(request, reply) {
  const userId = request.user.sub;
  const fileName = request.uploadedFile.fileName;
  const filePath = request.uploadedFile.filePath;

  try {
    await avatarModels.createAvatar(userId, fileName);
  } catch (err) {
    await deleteFile(filePath).catch(() => {});
    return reply.code(500).send({
      error: "Database error",
      message: err.message,
    });
  }

  return reply.code(201).send({
    message: "Avatar uploaded successfully",
  });
}

export const readAvatar = async (request, reply) => {
  const userId = request.params.id;

  let avatar;
  try {
    avatar = await avatarModels.readAvatar(userId);
  } catch (err) {
    return reply.code(500).send({
      error: "Database error",
      message: err.message,
    });
  }

  if (!avatar || !avatar.avatar_name) {
    return reply.code(404).send({ error: "Avatar not found" });
  }

  const filePath = path.join(AVATARS_PATH, avatar.avatar_name);

  try {
    await fs.promises.access(filePath);
  } catch {
    return reply.code(404).send({ error: "Avatar file not found" });
  }

  try {
    return reply.sendFile(avatar.avatar_name, AVATARS_PATH);
  } catch (err) {
    return reply.code(500).send({
      error: "Failed to send file",
      message: err.message,
    });
  }
};

export const updateAvatar = async (request, reply) => {
  const userId = request.user.sub;
  const fileName = request.uploadedFile.fileName;
  const filePath = request.uploadedFile.filePath;

  let currentAvatar;
  try {
    currentAvatar = await avatarModels.readAvatar(userId);
  } catch (err) {
    await deleteFile(filePath).catch(() => {});
    return reply.code(500).send({
      error: "Database error",
      message: err.message,
    });
  }

  if (!currentAvatar || !currentAvatar.avatar_name) {
    await deleteFile(filePath).catch(() => {});
    return reply.code(404).send({
      error: "No avatar to update.",
    });
  }

  try {
    await avatarModels.updateAvatar(userId, fileName);
  } catch (err) {
    await deleteFile(filePath).catch(() => {});
    return reply.code(500).send({
      error: "Database error",
      message: err.message,
    });
  }

  const oldFilePath = path.join(AVATARS_PATH, currentAvatar.avatar_name);
  await deleteFile(oldFilePath).catch(() => {});

  return reply.code(200).send({
    message: "Avatar updated successfully",
  });
};

export const deleteAvatar = async (request, reply) => {
  const userId = request.user.sub;

  let avatar;
  try {
    avatar = await avatarModels.readAvatar(userId);
  } catch (err) {
    return reply.code(500).send({
      error: "Database error",
      message: err.message,
    });
  }

  if (!avatar || !avatar.avatar_name) {
    return reply.code(404).send({ error: "Avatar not found" });
  }

  try {
    await avatarModels.deleteAvatar(userId);
  } catch (err) {
    return reply.code(500).send({
      error: "Database error",
      message: err.message,
    });
  }

  const filePath = path.join(AVATARS_PATH, avatar.avatar_name);
  await deleteFile(filePath).catch(() => {});

  return reply.code(200).send({
    message: "Avatar deleted successfully",
  });
};

export async function avatarNotExists(request, reply) {
  const userId = request.user.sub;

  let exists;
  try {
    exists = await avatarModels.avatarExists(userId);
  } catch (err) {
    return reply.code(500).send({
      error: "Database error",
      message: err.message,
    });
  }

  if (exists) {
    return reply.code(409).send({
      error: "Avatar already exists",
      message: "User already has an avatar.",
    });
  }
}
