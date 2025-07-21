export const isDev = process.env.NODE_ENV === "development";
export const SECRETKEY = process.env.SECRETKEY;
export const PORT = process.env.JWT_SERVICE_PORT;

if (!SECRETKEY) {
  console.error("Unable to load secret key from environement variables");
  process.exit(1);
}

if (!PORT) {
  console.error("Unable to load port from environement variables");
  process.exit(1);
}

// Redis service
export const REDIS_SERVICE_HOST = isDev
  ? "localhost"
  : process.env.REDIS_SERVICE_HOST;
export const REDIS_SERVICE_PORT = process.env.REDIS_SERVICE_PORT;
export const REDIS_SERVICE_PASSWORD = process.env.REDIS_SERVICE_PASSWORD;

if (!REDIS_SERVICE_HOST) {
  console.error("Unable to load redis service host from environment variables");
  process.exit(1);
}

if (!REDIS_SERVICE_PORT) {
  console.error("Unable to load redis service port from environment variables");
  process.exit(1);
}

if (!REDIS_SERVICE_PASSWORD) {
  console.error(
    "Unable to load redis service password from environment variables"
  );
  process.exit(1);
}
