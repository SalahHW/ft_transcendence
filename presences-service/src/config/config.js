// import dotenv from 'dotenv';
// dotenv.config();
export const isDev = process.env.NODE_ENV === "development";

export const PORT = process.env.PRESENCES_SERVICE_PORT;

if (!PORT) {
  console.error("Unable to load port from environment variables");
  process.exit(1);
}
