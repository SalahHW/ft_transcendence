export const isDev = process.env.NODE_ENV === "development";

const devPort = 3000;
const devDBPath = "./database/users.db";

export const PORT = isDev ? devPort : process.env.USERS_SERVICE_PORT;
export const DB_PATH = isDev ? devDBPath : process.env.USERS_DB_PATH;

if (!PORT) {
  console.error("Unable to load port from environment variables");
  process.exit(1);
}

if (!DB_PATH) {
  console.error("Unable to load database path from environment variables");
  process.exit(1);
}
