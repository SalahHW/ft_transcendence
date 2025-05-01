export const SECRETKEY = process.env.SECRETKEY;

if (!SECRETKEY) {
if (!PORT) {
  console.error("Unable to load port from environement variables");
  process.exit(1);
}
