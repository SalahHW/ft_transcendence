import fs from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { fileTypeFromFile } from "file-type";
import { AVATAR_UPLOAD_DIR } from "../config/config.js";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg"];

export const ensureAvatarDirExists = async () => {
  try {
    await fs.mkdir(AVATAR_UPLOAD_DIR, { recursive: true });
  } catch (err) {
    throw new Error(`Failed to create avatar directory: ${err.message}`);
  }
};

export const saveFileToDisk = async (fileData, fullPath) => {
  try {
    await pipeline(fileData.file, createWriteStream(fullPath));
  } catch (err) {
    throw new Error(`Failed to save file: ${err.message}`);
  }
};

export const saveUploadedAvatar = async (fileData) => {
  await ensureAvatarDirExists();

  const tempName = `upload-${Date.now()}`;
  const tempPath = path.join(AVATAR_UPLOAD_DIR, tempName);
  await saveFileToDisk(fileData, tempPath);

  const type = await fileTypeFromFile(tempPath);
  if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
    await fs.unlink(tempPath).catch(() => {});
    throw new Error(`Invalid file type: ${type ? type.mime : "unknown"}`);
  }

  const finalName = `avatar-${Date.now()}.${type.ext}`;
  const finalPath = path.join(AVATAR_UPLOAD_DIR, finalName);

  try {
    await fs.rename(tempPath, finalPath);
  } catch (err) {
    await fs.unlink(tempPath).catch(() => {});
    throw new Error(`Failed to finalize file: ${err.message}`);
  }

  console.log(`Saved avatar: ${finalPath} (type: ${type.mime})`);

  return {
    filePath: finalPath,
    relativePath: `/avatar/${finalName}`,
  };
};
