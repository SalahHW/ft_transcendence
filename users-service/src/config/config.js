export const isDev = process.env.NODE_ENV === "development";

const devPort = 3000;
const devDBPath = "./database/users.db";

export const PORT = isDev ? devPort : process.env.USERS_SERVICE_PORT;
export const DB_PATH = isDev ? devDBPath : process.env.DB_PATH;

const validEnv = PORT && DB_PATH;

if (!validEnv) {
  console.error("Unable to load environment variables");
  process.exit(1);
}
