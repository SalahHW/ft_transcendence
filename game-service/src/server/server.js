import Fastify from 'fastify';
import WebSocketPlugin from '@fastify/websocket';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { registerApiRoutes } from './api.js';
import { startGameLoop } from './gameLoop.js';
import { registerWebSocketRoutes } from './gameWebSocket.js';
import { getPlayers } from './gameState.js';

// Load environment variables
dotenv.config();

// Read HTTPS certificates
const serverConfig = {
  key: fs.readFileSync('src/server/certs/key.pem'),
  cert: fs.readFileSync('src/server/certs/cert.pem'),
};

// Initialize Fastify with HTTPS
const fastify = Fastify({
  https: serverConfig,
  logger: true,
});

// Add UUID generator to Fastify instance
fastify.decorate('uuid', uuidv4);

console.log('Registering @fastify/websocket plugin');

// Register WebSocket plugin
fastify.register(WebSocketPlugin, {
  options: {
    clientTracking: true,
    verifyClient: (info, next) => {
      console.log('Verifying WebSocket client:', info.req.url);
      next(true);
    },
  },
}).after(err => {
  if (err) {
    console.error('Failed to register @fastify/websocket:', err);
    process.exit(1);
  }
  console.log('@fastify/websocket registered successfully');
});

// Register API routes
fastify.register(registerApiRoutes, { players: getPlayers() });

// Register WebSocket routes
fastify.register(registerWebSocketRoutes);

// Start the server
const port = process.env.GAME_SERVICE_PORT || 8080;
fastify.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Game server running on port ${port}`);
  startGameLoop();
});