import fs from "fs/promises";

export async function directoryExists(path) {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch (err) {
    if (err.code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

export async function createDirectory(path) {
  try {
    await fs.mkdir(path, { recursive: true });
  } catch (err) {
    throw new Error(`Failed to create directory :`, err.message);
  }
}
