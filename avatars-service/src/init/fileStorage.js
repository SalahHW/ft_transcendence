import { AVATARS_PATH } from "../config/config.js";
import * as directoryUtils from "../utils/directoryUtils.js";

export async function initializeFileStorage() {
  try {
    const exists = await directoryUtils.directoryExists(AVATARS_PATH);
    if (exists) {
      return;
    }

    await directoryUtils.createDirectory(AVATARS_PATH);
  } catch (err) {
    console.error("Directory initialization failed:", err.message);
    process.exit(1);
  }
}
