import Fastify from 'fastify';
import WebSocketPlugin from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerApiRoutes } from './api.js';
import { startGameLoop } from './gameLoop.js';
import { registerWebSocketRoutes } from './gameWebSocket.js';
import { getPlayers } from './gameState.js';
import cors from '@fastify/cors';
import { SERVER_CONFIG } from '../core/constants.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Read HTTPS certificates
const serverConfig = {
  key: fs.readFileSync(SERVER_CONFIG.KEY_PATH),
  cert: fs.readFileSync(SERVER_CONFIG.CERT_PATH),
};

// Function to register common plugins and routes
function registerCommonComponents(server) {
  // Add UUID generator to Fastify instance
  server.decorate('uuid', uuidv4);

  // Register CORS
  server.register(cors, {
    origin: SERVER_CONFIG.ALLOWED_ORIGINS,
    methods: SERVER_CONFIG.ALLOWED_METHODS,
    allowedHeaders: SERVER_CONFIG.ALLOWED_HEADERS,
    credentials: true
  });

  // 🔊 Register static file serving for sounds
  server.register(fastifyStatic, {
    root: path.join(__dirname, '../../public'),
    prefix: '/',
  });

  // Register WebSocket plugin
  server.register(WebSocketPlugin, {
    options: {
      clientTracking: true,
      verifyClient: (info, next) => {
        console.log('Verifying WebSocket client:', info.req.url);
        next(true);
      },
    },
  });

  // Register API routes
  server.register(registerApiRoutes, { players: getPlayers() });

  // Register WebSocket routes
  server.register(registerWebSocketRoutes);
}

// Initialize Fastify with HTTPS
const httpsServer = Fastify({
  https: serverConfig,
  logger: true,
});

// Initialize Fastify with HTTP
const httpServer = Fastify({
  logger: true,
});

console.log('Registering components for both HTTP and HTTPS servers');

// Register components for both servers
registerCommonComponents(httpsServer);
registerCommonComponents(httpServer);

// Start both servers
const port = process.env.GAME_SERVICE_PORT || SERVER_CONFIG.DEFAULT_HTTPS_PORT;
const httpPort = SERVER_CONFIG.DEFAULT_HTTP_PORT;

httpsServer.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    httpsServer.log.error(err);
    process.exit(1);
  }
  console.log(`HTTPS Game server running on port ${port}`);
});

httpServer.listen({ port: httpPort, host: '0.0.0.0' }, (err) => {
  if (err) {
    httpServer.log.error(err);
    process.exit(1);
  }
  console.log(`HTTP Game server running on port ${httpPort}`);
  startGameLoop();
});