export const isDev = process.env.NODE_ENV === "development";

const devPort = 3003;
const devDatabasePath = "./database/friendships.db";

export const PORT = isDev ? devPort : process.env.FRIENDS_SERVICE_PORT;

export const DB_PATH = isDev
  ? devDatabasePath
  : process.env.FRIENDSHIPS_DB_PATH;

if (!DB_PATH) {
  console.error("Unable to load database path environment variables");
  process.exit(1);
}
