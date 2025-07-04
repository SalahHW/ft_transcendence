export const isDev = process.env.NODE_ENV === "development";

export const PORT = process.env.AVATARS_SERVICE_PORT;
export const DB_PATH = isDev
  ? process.env.DEV_DB_PATH
  : process.env.AVATARS_DB_PATH;
export const AVATARS_PATH = process.env.AVATARS_PATH;
export const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL;
export const USERS_SERVICE_TIMEOUT = process.env.USERS_SERVICE_TIMEOUT;

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

if (!USERS_SERVICE_TIMEOUT) {
  console.error(
    "Unable to load users service timeout from environment variable"
  );
  process.exit(1);
}
