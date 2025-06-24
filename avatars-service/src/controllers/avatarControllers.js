import * as avatarModels from "../models/avatarModels.js";
import { saveUploadedAvatar } from "../utils/uploadUtils.js";
import path from "path";
import { AVATARS_PATH } from "../config/config.js";
import fs from "fs";

export const createAvatar = async (request, reply) => {
  try {
    if (!request.isMultipart()) {
      return reply
        .code(406)
        .send({ error: "Request is not multipart/form-data" });
    }

    const fileData = await request.file();

    if (!fileData) {
      return reply.code(400).send({ error: "No file uploaded" });
    }

    const { fileName } = await saveUploadedAvatar(fileData);

    const userId = request.params.id;

    await avatarModels.createAvatar(userId, fileName);

    return reply.code(201).send({
      message: "Avatar uploaded successfully",
    });
  } catch (err) {
    return reply.code(400).send({
      error: err.message,
    });
  }
};

export const readAvatar = async (request, reply) => {
  try {
    const userId = request.params.id;
    const avatar = await avatarModels.readAvatar(userId);

    if (!avatar || !avatar.avatar_name) {
      return reply.code(404).send({ error: "Avatar not found" });
    }

    const filePath = path.join(AVATARS_PATH, avatar.avatar_name);

    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({ error: "Avatar file not found" });
    }

    return reply.sendFile(avatar.avatar_name, AVATARS_PATH);
  } catch (err) {
    return reply.code(400).send({
      error: err.message,
    });
  }
};

export const updateAvatar = async (request, reply) => {
  try {
    if (!request.isMultipart()) {
      return reply
        .code(406)
        .send({ error: "Request is not multipart/form-data" });
    }

    const fileData = await request.file();
    if (!fileData) {
      return reply.code(400).send({ error: "No file uploaded" });
    }

    const userId = request.params.id;
    const avatar = await avatarModels.readAvatar(userId);
    if (!avatar || !avatar.avatar_name) {
      return reply.code(404).send({ error: "Avatar not found" });
    }

    const oldFilePath = path.join(AVATARS_PATH, avatar.avatar_name);
    if (fs.existsSync(oldFilePath)) {
      await fs.promises.unlink(oldFilePath).catch(() => {});
    }

    const { fileName } = await saveUploadedAvatar(fileData);
    await avatarModels.updateAvatar(userId, fileName);

    return reply.code(200).send({
      message: "Avatar updated successfully",
    });
  } catch (err) {
    return reply.code(400).send({
      error: err.message,
    });
  }
};

export const deleteAvatar = async (request, reply) => {
  try {
    const userId = request.params.id;
    const avatar = await avatarModels.readAvatar(userId);
    if (!avatar || !avatar.avatar_name) {
      return reply.code(404).send({ error: "Avatar not found" });
    }

    const filePath = path.join(AVATARS_PATH, avatar.avatar_name);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath).catch(() => {});
    }

    await avatarModels.deleteAvatar(userId);

    return reply.code(200).send({
      message: "Avatar deleted successfully",
    });
  } catch (err) {
    return reply.code(400).send({
      error: err.message,
    });
  }
};
