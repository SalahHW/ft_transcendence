import Fastify from 'fastify';
import WebSocketPlugin from '@fastify/websocket';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { registerApiRoutes } from './api.js';
import { startGameLoop } from './gameLoop.js';
import { registerWebSocketRoutes } from './gameWebSocket.js';
import { getPlayers } from './gameState.js';
import cors from '@fastify/cors';

// Load environment variables
dotenv.config();

// Read HTTPS certificates
const serverConfig = {
  key: fs.readFileSync('src/server/certs/key.pem'),
  cert: fs.readFileSync('src/server/certs/cert.pem'),
};

// Function to register common plugins and routes
function registerCommonComponents(server) {
  // Add UUID generator to Fastify instance
  server.decorate('uuid', uuidv4);

  // Register CORS
  server.register(cors, {
    origin: ['http://localhost', 'https://localhost', 'http://localhost:80', 'https://localhost:80'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
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
const port = process.env.GAME_SERVICE_PORT || 8080;
const httpPort = 8081; // HTTP port

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