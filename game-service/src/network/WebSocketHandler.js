import { messageRouter } from './MessageRouter.js';
import { connectionManager } from './ConnectionManager.js';
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
    
    // Setup disconnect handling
    this._setupDisconnectHandling(ws, playerId, roomId);
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
      
      // Optional: Log message frequency for debugging
      // if (messageCount % 10 === 0) {
      //   console.log('Received WebSocket message:', data.toString());
      // }

      // Route the message
      this.messageRouter.routeMessage(
        data, 
        playerId, 
        roomId, 
        ws, 
        this._createDisconnectHandler(playerId, roomId)
      );
    });
  }

  /**
   * Setup disconnect handling for WebSocket connection
   */
  _setupDisconnectHandling(ws, playerId, roomId) {
    ws.on('close', () => {
      console.log(`🚪 WebSocket closed for player ${playerId} in room ${roomId}`);
      this.connectionManager.handlePlayerDisconnect(playerId, roomId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for player ${playerId}:`, error);
      this.connectionManager.handlePlayerDisconnect(playerId, roomId);
    });
  }

  /**
   * Create disconnect handler function
   */
  _createDisconnectHandler(playerId, roomId) {
    return (disconnectPlayerId, disconnectRoomId) => {
      this.connectionManager.handlePlayerDisconnect(
        disconnectPlayerId || playerId, 
        disconnectRoomId || roomId
      );
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
   * Clean up stale connections (can be called periodically)
   */
  cleanupStaleConnections() {
    this.connectionManager.cleanupStaleConnections();
  }

  /**
   * Gracefully close all connections
   */
  closeAllConnections() {
    const stats = this.getConnectionStats();
    console.log(`Closing ${stats.activeConnections} active connections...`);
    
    stats.connectionsDetail.forEach(({ playerId, roomId }) => {
      this.connectionManager.handlePlayerDisconnect(playerId, roomId);
    });
    
    console.log('All connections closed.');
  }
}

// Create singleton instance  
export const webSocketHandler = new WebSocketHandler(); 