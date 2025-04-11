export const isDev = process.env.NODE_ENV === "development";

export const PORT = isDev ? 3000 : process.env.USERS_SERVICE_PORT;
export const SECRETKEY = isDev ? "secret key" : process.env.SECRETKEY;
const validEnv = PORT && SECRETKEY;

if (!validEnv) {
  console.error("Unable to load environement variables");
  process.exit(1);
}
