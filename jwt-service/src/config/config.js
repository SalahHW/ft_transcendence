export const SECRETKEY = process.env.SECRETKEY;

if (!SECRETKEY) {
  console.error("Enable to load secret key from evironement variables");
  process.exit(1);
}
