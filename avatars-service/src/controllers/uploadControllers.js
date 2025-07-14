import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import fs from "fs/promises";
import { fileTypeFromFile } from "file-type";
import path from "path";
import { deleteFile } from "../utils/fileUtils.js";
import { AVATARS_PATH, ALLOWED_MIME_TYPES } from "../config/config.js";

function generateTempFilename() {
  return `upload-${Date.now()}`;
}

async function saveStream(fileStream, tempPath) {
  try {
    await pipeline(fileStream, createWriteStream(tempPath));
  } catch (err) {
    throw new Error(`Failed to save stream to disk: ${err.message}`);
  }
}

async function validateMimeType(filePath) {
  try {
    const type = await fileTypeFromFile(filePath);
    if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
      await deleteFile(filePath);
      throw new Error(`Invalid file type: ${type?.mime ?? "unknown"}`);
    }
    return type;
  } catch (err) {
    await deleteFile(filePath).catch(() => {});
    throw err;
  }
}

async function finalizeUpload(tempPath, type) {
  const finalName = `avatar-${Date.now()}.${type.ext}`;
  const finalPath = path.join(AVATARS_PATH, finalName);

  try {
    await fs.rename(tempPath, finalPath);
    return { fileName: finalName, filePath: finalPath };
  } catch (err) {
    await deleteFile(tempPath);
    throw new Error(`Failed to finalize uploaded file: ${err.message}`);
  }
}

export async function handleFileUpload(request, reply) {
  const fileData = request.file;
  const tempName = generateTempFilename();
  const tempPath = path.join(AVATARS_PATH, tempName);

  try {
    await saveStream(fileData.file, tempPath);
  } catch (error) {
    return reply
      .code(500)
      .send({ error: "Failed to save uploaded file to disk" });
  }

  let type;
  try {
    type = await validateMimeType(tempPath);
  } catch (error) {
    return reply
      .code(400)
      .send({ error: "Invalid file type. Only images are allowed" });
  }

  let uploadResult;
  try {
    uploadResult = await finalizeUpload(tempPath, type);
  } catch (error) {
    return reply.code(500).send({ error: "Failed to finalize file upload" });
  }

  request.uploadedFile = {
    fileName: uploadResult.fileName,
    filePath: uploadResult.filePath,
    mime: type.mime,
  };
}
