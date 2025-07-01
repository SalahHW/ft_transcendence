export const isDev = process.env.NODE_ENV === "development";

const devPort = 3001;
const devDBPath = "./database/avatars.db";
const devAvatarDir = "./avatars";
const devUsersServiceUrl = "http://localhost:3000";

export const PORT = isDev ? devPort : process.env.AVATARS_SERVICE_PORT;
export const DB_PATH = isDev ? devDBPath : process.env.AVATARS_DB_PATH;
export const AVATARS_PATH = isDev ? devAvatarDir : process.env.AVATARS_PATH;

export const USERS_SERVICE_URL = isDev
  ? devUsersServiceUrl
  : process.env.USERS_SERVICE_URL;

export const USERS_SERVICE_TIMEOUT = 2000;

if (!PORT) {
  console.error("Unable to load port from environment variables");
  process.exit(1);
}

if (!DB_PATH) {
  console.error("Unable to load database path from environment variables");
  process.exit(1);
}

if (!AVATARS_PATH) {
  console.error("Unable to load avatar path from environment variables");
  process.exit(1);
}

if (!USERS_SERVICE_URL) {
  console.error("Unable to load users service url from environment variable");
  process.exit(1);
}
