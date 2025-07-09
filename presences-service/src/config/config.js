import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 👇 Charge le .env depuis la racine du projet
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const isDev = process.env.NODE_ENV === "development";

export const PORT = process.env.PRESENCES_SERVICE_PORT;

if (!PORT) {
  console.error("Unable to load port from environment variables");
  process.exit(1);
}