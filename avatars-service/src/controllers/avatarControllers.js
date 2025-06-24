import * as avatarModels from "../models/avatarModels.js";
import { saveUploadedAvatar } from "../utils/uploadUtils.js";

export const uploadAvatar = async (request, reply) => {
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

    const { relativePath } = await saveUploadedAvatar(fileData);

    console.log(relativePath);

    const userId = request.params.id;

    await avatarModels.createAvatar(userId, relativePath);

    return reply.code(201).send({
      message: "Avatar uploaded successfully",
    });
  } catch (err) {
    return reply.code(400).send({
      error: err.message,
    });
  }
};

export const createAvatar = async (request, reply) => {};

export const readAvatar = async (request, reply) => {};

export const updateAvatar = async (request, reply) => {};

export const deleteAvatar = async (request, reply) => {};
