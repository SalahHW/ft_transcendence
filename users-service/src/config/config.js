export const isDev = process.env.NODE_ENV === "development";

export const PORT = process.env.USERS_SERVICE_PORT;
export const DB_PATH = isDev 
? process.env.DEV_DB_PATH 
: process.env.USERS_DB_PATH;

if (!PORT) {
  console.error("Unable to load port from environment variables");
  process.exit(1);
}

if (!DB_PATH) {
  console.error("Unable to load database path from environment variables");
  process.exit(1);
}
