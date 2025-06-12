import { webSocketHandler } from '../network/WebSocketHandler.js';

/**
 * Register WebSocket routes - now delegates to network module
 * This file serves as a backward compatibility layer
 */
export async function registerWebSocketRoutes(fastify) {
  return webSocketHandler.registerWebSocketRoutes(fastify);
}

/**
 * Get connection statistics
 */
export function getConnectionStats() {
  return webSocketHandler.getConnectionStats();
}

/**
 * Clean up stale connections
 */
export function cleanupStaleConnections() {
  return webSocketHandler.cleanupStaleConnections();
}