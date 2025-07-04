import { messageRouter } from './MessageRouter.js';
import { connectionManager } from './ConnectionManager.js';
import { disconnectionHandler } from '../server/disconnect.js';
import { browserDisconnectHandler } from '../server/disconnect/browserDisconnect/index.js';
import { WebSocketUtils } from '../utils/helpers.js';
import { gameStateManager } from '../game/GameStateManager.js';

/**
 * Handles WebSocket connections and events
 */
export class WebSocketHandler {
  constructor() {
    this.messageRouter = messageRouter;
    this.connectionManager = connectionManager;
  }

  /**
   * Register WebSocket routes with Fastify
   */
  async registerWebSocketRoutes(fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
      console.log('WebSocket route hit, connection:', Object.keys(connection));
      const ws = connection;
      
      if (!ws) {
        console.error('WebSocket connection is undefined, connection:', connection);
        return;
      }
      
      console.log('WebSocket connection established, readyState:', ws.readyState);
      this._handleNewConnection(ws, req, fastify);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  _handleNewConnection(ws, req, fastify) {
    const playerId = req.query.playerId || fastify.uuid();
    const roomId = this.connectionManager.handlePlayerConnection(ws, playerId);

    // Setup message handling
    this._setupMessageHandling(ws, playerId, roomId);
    
    // Setup browser disconnect handling for enhanced detection
    browserDisconnectHandler.setupBrowserDisconnectHandlers(ws, playerId, roomId);
  }

  /**
   * Setup message handling for WebSocket connection
   */
  _setupMessageHandling(ws, playerId, roomId) {
    let messageCount = 0;
    
    ws.on('message', (data) => {
      messageCount++;
      
      // Update player activity
      this.connectionManager.updatePlayerActivity(playerId);
      
      // Use current room for message routing
      const currentRoomId = ws.roomId || roomId;
      
      // Route the message
      this.messageRouter.routeMessage(
        data, 
        playerId, 
        currentRoomId,
        ws, 
        disconnectionHandler.createDisconnectHandler(playerId, currentRoomId)
      );
    });
  }

  /**
   * Setup disconnect handling for WebSocket connection (delegated to disconnect module)
   */
  _setupDisconnectHandling(ws, playerId, roomId) {
    // Delegate to the dedicated disconnect handler
    return disconnectionHandler.setupWebSocketDisconnectHandlers(ws, playerId, roomId);
  }

  /**
   * Create disconnect handler function (delegated to disconnect module)
   */
  _createDisconnectHandler(playerId, roomId) {
    // Delegate to the dedicated disconnect handler
    return disconnectionHandler.createDisconnectHandler(playerId, roomId);
  }

  /**
   * Broadcast message to specific WebSocket if available
   */
  sendToPlayer(playerId, message) {
    const player = gameStateManager.getPlayer(playerId);
    if (player && WebSocketUtils.isWebSocketReady(player.ws)) {
      return WebSocketUtils.sendJSON(player.ws, message);
    }
    return false;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return this.connectionManager.getConnectionStats();
  }

  /**
   * Clean up stale connections (delegated to disconnect module)
   */
  cleanupStaleConnections() {
    // Delegate to the dedicated disconnect handler
    return disconnectionHandler.cleanupStaleConnections();
  }

  /**
   * Gracefully close all connections (delegated to disconnect module)
   */
  closeAllConnections() {
    // Delegate to the dedicated disconnect handler
    return disconnectionHandler.closeAllConnections();
  }
}

// Create singleton instance  
export const webSocketHandler = new WebSocketHandler(); 