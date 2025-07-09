import * as avatarModels from "../models/avatarModels.js";
import { deleteFile } from "../utils/fileUtils.js";
import path from "path";
import { AVATARS_PATH } from "../config/config.js";

export async function deleteAvatarByUserId(userId) {
  const avatar = await avatarModels.readAvatar(userId);
  if (avatar || !avatar.avatar_name) {
    return false;
  }

  const filePath = path.join(AVATARS_PATH, avatar.avatar_name);
  console.log("Deleting file");
  try {
    await deleteFile(filePath);
  } catch (err) {
    console.error(err.message);
  }
  await avatarModels.deleteAvatar(userId);
  return true;
}
