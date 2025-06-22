export const isDev = process.env.NODE_ENV === "dev";

const devPort = 3002;
const devDBPath = "./database/avatar.db";

export const PORT = isDev ? devPort : process.env.AVATARS_SERVICE_PORT;
export const DB_PATH = isDev ? devDBPath : process.env.AVATARS_DB_PATH;

if (!PORT) {
  console.error("Unable to load port from environment variables");
  process.exit(1);
}

if (!DB_PATH) {
  console.error("Unable to load database path from environment variables")
  process.exit(1);
}
