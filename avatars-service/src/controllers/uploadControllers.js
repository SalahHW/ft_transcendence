import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import fs from "fs/promises";
import { fileTypeFromFile } from "file-type";
import path from "path";
import { httpError } from "../errors/httpErrors.js";
import { deleteFile } from "../utils/fileUtils.js";
import { AVATARS_PATH, ALLOWED_MIME_TYPES } from "../config/config.js";

function generateTempFilename() {
  return `upload-${Date.now()}`;
}

async function saveStream(fileStream, tempPath) {
  try {
    await pipeline(fileStream, createWriteStream(tempPath));
  } catch (err) {
    throw httpError(`Failed to save stream to disk: ${err.message}`, 500);
  }
}

async function validateMimeType(filePath) {
  const type = await fileTypeFromFile(filePath);
  if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
    await deleteFile(filePath);
    throw httpError(`Invalid file type: ${type?.mime ?? "unknown"}`, 415);
  }
  return type;
}

async function finalizeUpload(tempPath, type) {
  const finalName = `avatar-${Date.now()}.${type.ext}`;
  const finalPath = path.join(AVATARS_PATH, finalName);

  try {
    await fs.rename(tempPath, finalPath);
    return { fileName: finalName, filePath: finalPath };
  } catch (err) {
    await deleteFile(tempPath);
    throw httpError(`Failed to finalize uploaded file: ${err.message}`, 500);
  }
}

export async function handleFileUpload(fileData) {
  const tempName = generateTempFilename();
  const tempPath = path.join(AVATARS_PATH, tempName);

  await saveStream(fileData.file, tempPath);
  const type = await validateMimeType(tempPath);
  const { fileName, filePath } = await finalizeUpload(tempPath, type);

  return { fileName, filePath, mime: type.mime };
}
