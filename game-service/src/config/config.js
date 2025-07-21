import dotenv from 'dotenv';

dotenv.config();

// JWT Service Configuration
export const JWT_SERVICE_HOST = process.env.JWT_SERVICE_HOST || 'jwt';
export const JWT_SERVICE_PORT = process.env.JWT_SERVICE_PORT || '3002';

// Game Service Configuration
export const GAME_SERVICE_PORT = process.env.GAME_SERVICE_PORT || 8080;
export const GAME_SERVICE_HTTP_PORT = process.env.GAME_SERVICE_HTTP_PORT || 8081;

// Database Configuration (if needed later)
export const DATABASE_URL = process.env.DATABASE_URL || 'sqlite:./game.db';

// Environment
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const isDev = NODE_ENV === 'development'; 