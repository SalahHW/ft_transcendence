const isDev = process.env.NODE_ENV === 'development';

const PORT = isDev ? 3000 : process.env.USERS_SERVICE_PORT;
const SECRETKEY = isDev ? 'secret key' : process.env.SECRETKEY;
const validEnv = PORT && SECRETKEY;

if (!validEnv) {
  console.error('Unable to load environement variables');
  process.exit(1);
}

export default { PORT, SECRETKEY, isDev };