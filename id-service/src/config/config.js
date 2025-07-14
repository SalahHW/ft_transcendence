export const isDev = process.env.NODE_ENV === "development";

const devPort = 3007;
const devDBPath = "./database/ids.db";

export const PORT = isDev ? devPort : process.env.ID_SERVICE_PORT;
export const DB_PATH = isDev ? devDBPath : process.env.ID_DB_PATH;

if (!PORT) {
  console.error("Unable to load port from environment variables");
  process.exit(1);
}

if (!DB_PATH) {
  console.error("Unable to load database path from environment variables");
  process.exit(1);
} 