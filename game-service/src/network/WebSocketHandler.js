import { messageRouter } from './MessageRouter.js';
import { connectionManager } from './ConnectionManager.js';
import { setupDisconnectDetection } from '../server/disconnect/index.js';
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
    
    // Setup disconnect detection for unexpected disconnections
    setupDisconnectDetection(ws, playerId, roomId);
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
        ws
      );
    });
  }

  /**
   * Setup disconnect handling for WebSocket connection
   */
  _setupDisconnectHandling(ws, playerId, roomId) {
    setupDisconnectDetection(ws, playerId, roomId);
  }

  /**
   * Create disconnect handler function
   */
  _createDisconnectHandler(playerId, roomId) {
    return (reason) => {
      // This is now handled by the disconnect detection system
      console.log(`Disconnect handler called for player ${playerId} with reason: ${reason}`);
    };
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
   * Clean up stale connections
   */
  cleanupStaleConnections() {
    // This is now handled by the disconnect detection system
    console.log('Cleanup handled by disconnect detection system');
  }

  /**
   * Close all connections
   */
  closeAllConnections() {
    // This is now handled by the disconnect detection system
    console.log('Connection closing handled by disconnect detection system');
  }
}

// Create singleton instance  
export const webSocketHandler = new WebSocketHandler(); 