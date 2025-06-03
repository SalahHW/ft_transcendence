export const isDev = process.env.NODE_ENV === "development";

const devPort = process.env.DEV_PORT;

export const PORT = isDev ? devPort : 3000;

const validEnv = PORT;

if (!validEnv) {
  console.log("Unable to load environment variables");
  process.exit(1);
}
