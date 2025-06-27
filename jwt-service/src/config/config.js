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
