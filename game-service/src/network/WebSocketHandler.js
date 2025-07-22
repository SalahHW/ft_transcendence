import { messageRouter } from './MessageRouter.js';
import { connectionManager } from './ConnectionManager.js';
import { setupDisconnectDetection, handlePlayerDisconnect, handleExplicitLeave, handleBrowserEvent } from '../server/disconnect/index.js';
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
  async _handleNewConnection(ws, req, fastify) {
    const playerId = req.query.playerId || fastify.uuid();
    const roomId = req.query.roomId || null;
    const matchType = req.query.matchType || '1v1';
    
    // Set matchType on WebSocket for connection manager
    ws.matchType = matchType;
    
    const assignedRoomId = await this.connectionManager.handlePlayerConnection(ws, playerId, roomId);

    if (assignedRoomId) {
      // Setup message handling
      this._setupMessageHandling(ws, playerId, assignedRoomId);
      
      // Setup disconnect detection for unexpected disconnections
      setupDisconnectDetection(ws, playerId, assignedRoomId);
      
      // Setup actual WebSocket event listeners
      this._setupWebSocketEventListeners(ws, playerId, assignedRoomId);
    } else {
      console.error(`Failed to establish connection for player ${playerId}`);
      ws.close(1000, 'Connection failed');
    }
  }

  /**
   * Setup message handling for WebSocket connection
   */
  _setupMessageHandling(ws, playerId, roomId) {
    let messageCount = 0;
    
    ws.on('message', async (data) => {
      messageCount++;
      
      // Update player activity
      this.connectionManager.updatePlayerActivity(playerId);
      
      // Use current room for message routing
      const currentRoomId = ws.roomId || roomId;
      
      // Route the message
      await this.messageRouter.routeMessage(
        data, 
        playerId, 
        currentRoomId,
        ws
      );
    });
  }

  /**
   * Setup actual WebSocket event listeners for disconnect handling
   */
  _setupWebSocketEventListeners(ws, playerId, roomId) {
    // Handle WebSocket close events
    ws.on('close', async (code, reason) => {
      // Use the current room ID from the WebSocket connection, not the original room ID
      // This is important for tournament transfers where players move between rooms
      const currentRoomId = ws.roomId || roomId;
      console.log(`🔌 WebSocket closed for player ${playerId} in room ${currentRoomId}: code=${code}, reason=${reason}`);
      
      // ⭐ FIX: Check if this is a legitimate tournament closure before treating as disconnect
      if (await this._isLegitimateTournamentClosure(code, reason, playerId)) {
        console.log(`🏆 Legitimate tournament closure detected for player ${playerId}, skipping disconnect handling`);
        return;
      }
      
      // Get the disconnect reason from close code
      const disconnectReason = this._getDisconnectionReasonFromCloseCode(code);
      
      // Handle the disconnection through the disconnect system
      this._handlePlayerDisconnect(playerId, currentRoomId, disconnectReason);
    });

    // Handle WebSocket error events
    ws.on('error', (error) => {
      // Use the current room ID from the WebSocket connection, not the original room ID
      const currentRoomId = ws.roomId || roomId;
      console.error(`🔥 WebSocket error for player ${playerId} in room ${currentRoomId}:`, error);
      
      // Handle as network disconnect
      this._handlePlayerDisconnect(playerId, currentRoomId, 'network_disconnect');
    });

    // Start heartbeat monitoring
    this._startHeartbeat(playerId, roomId);

    console.log(`🔍 WebSocket event listeners set up for player ${playerId} in room ${roomId}`);
  }

  /**
   * Handle player disconnection through the disconnect system
   */
  _handlePlayerDisconnect(playerId, roomId, reason) {
    try {
      console.log(`🔌 Handling disconnect for player ${playerId} in room ${roomId} with reason: ${reason}`);
      
      // Stop heartbeat monitoring for this player
      this._stopHeartbeat(playerId);
      
      // Handle the disconnection through the disconnect system
      handlePlayerDisconnect(playerId, roomId, reason);
    } catch (error) {
      console.error(`Error handling disconnect for player ${playerId}:`, error);
    }
  }

  /**
   * Get disconnection reason from WebSocket close code
   */
  _getDisconnectionReasonFromCloseCode(code) {
    switch (code) {
      case 1000: // Normal closure
        return 'player_left';
      case 1001: // Going away
        return 'browser_navigation';
      case 1005: // No status received - can be legitimate in some cases
        return 'no_status_received';
      case 1006: // Abnormal closure
        return 'network_disconnect';
      default:
        return 'unexpected';
    }
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

  /**
   * Start heartbeat monitoring for player
   */
  _startHeartbeat(playerId, roomId, timeoutMs = 30000) {
    // Clear any existing heartbeat
    this._stopHeartbeat(playerId);

    const interval = setInterval(() => {
      const room = gameStateManager.getRoom(roomId);
      if (!room || room.isGameOver) {
        this._stopHeartbeat(playerId);
        return;
      }

      const player = gameStateManager.getPlayer(playerId);
      if (!player || !player.ws || player.ws.readyState !== 1) {
        console.log(`💓 Heartbeat timeout for player ${playerId}`);
        this._handlePlayerDisconnect(playerId, roomId, 'timeout');
        this._stopHeartbeat(playerId);
        return;
      }

      // Update player activity
      this.connectionManager.updatePlayerActivity(playerId);
    }, timeoutMs);

    // Store the interval for cleanup
    if (!this.heartbeatIntervals) {
      this.heartbeatIntervals = new Map();
    }
    this.heartbeatIntervals.set(playerId, interval);
  }

  /**
   * Stop heartbeat monitoring for player
   */
  _stopHeartbeat(playerId) {
    if (this.heartbeatIntervals && this.heartbeatIntervals.has(playerId)) {
      clearInterval(this.heartbeatIntervals.get(playerId));
      this.heartbeatIntervals.delete(playerId);
    }
  }

  /**
   * ⭐ NEW: Check if WebSocket closure is a legitimate tournament completion
   */
  async _isLegitimateTournamentClosure(code, reason, playerId) {
    // ⭐ FIX: Handle reason as either string or Buffer
    let reasonString = '';
    if (reason) {
      if (typeof reason === 'string') {
        reasonString = reason;
      } else if (Buffer.isBuffer(reason)) {
        reasonString = reason.toString('utf8');
      } else {
        reasonString = String(reason);
      }
    }
    
    // Check for legitimate tournament closure reasons (server-initiated only)
    const legitimateReasons = [
      'Tournament completed',
      'Tournament completed - 1st place',
      'Tournament completed - 2nd place', 
      'Tournament completed - 3rd place',
      'Tournament completed - 4th place',
      'Tournament placement determined',
      'Tournament placement determined - 1st place',
      'Tournament placement determined - 2nd place',
      'Tournament placement determined - 3rd place',
      'Tournament placement determined - 4th place',
      'Tournament cleanup',
      'Tournament cancelled - player disconnection'
      // ⭐ REMOVED: 'Tournament player left' - this is player-initiated, should trigger disconnect handling
    ];
    
    // Check if the close reason indicates legitimate tournament completion
    if (reasonString && legitimateReasons.some(legitReason => reasonString.includes(legitReason))) {
      return true;
    }
    
    // Also check for normal closure code with tournament-related reasons (but exclude player-initiated)
    if (code === 1000 && reasonString && reasonString.toLowerCase().includes('tournament')) {
      // ⭐ FIX: Exclude player-initiated disconnections
      if (reasonString.toLowerCase().includes('player left') || reasonString.toLowerCase().includes('left tournament')) {
        return false;
      }
      return true;
    }
    
    // ⭐ NEW: Check for code 1005 (No Status Received) - this can be legitimate after explicit leave
    if (code === 1005) {
      // Check if the player has explicitly requested to leave
      try {
        const { gameStateManager } = await import('../game/GameStateManager.js');
        const player = gameStateManager.getPlayer(playerId);
        if (player && player.isLeaving) {
          console.log(`🏆 Player ${playerId} had explicit leave request, treating code 1005 as legitimate`);
          return true;
        }
        
        // ⭐ NEW: Also check if this is a tournament room and the player recently left
        // This handles the case where the API leave request was processed but the WebSocket disconnect happens later
        const room = gameStateManager.getRoom(player?.roomId);
        if (room && room.metadata?.waitingRoomId) {
          try {
            const { tournamentManager } = await import('../tournament/TournamentManager.js');
            const waitingRoomData = tournamentManager.waitingRooms.get(room.metadata.waitingRoomId);
            if (waitingRoomData) {
              // ⭐ NEW: Check if tournament has already finished
              if (waitingRoomData.phase === 'FINISHED') {
                console.log(`🏆 Tournament ${room.metadata.waitingRoomId} already finished, treating code 1005 as legitimate`);
                return true;
              }
              
              const tournamentPlayer = waitingRoomData.players.find(p => p.id === playerId);
              // If player is not in the waiting room data anymore, they likely left explicitly
              if (!tournamentPlayer) {
                console.log(`🏆 Player ${playerId} not found in tournament waiting room data, likely left explicitly, treating code 1005 as legitimate`);
                return true;
              }
            }
          } catch (error) {
            console.error(`🏆 Error checking tournament waiting room data:`, error);
          }
        }
      } catch (error) {
        console.error(`🏆 Error checking player leave status:`, error);
      }
    }
    
    return false;
  }
}

// Create singleton instance  
export const webSocketHandler = new WebSocketHandler(); 