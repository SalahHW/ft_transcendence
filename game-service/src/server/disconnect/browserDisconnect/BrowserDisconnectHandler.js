import { gameStateManager } from '../../../game/GameStateManager.js';

/**
 * Browser Disconnect Handler
 * Detects disconnections during loading/transition states for 1v1 games
 */
export class BrowserDisconnectHandler {
  constructor() {
    this.connectionStates = {
      CONNECTING: 'connecting',
      LOADING: 'loading',           // During splash screen
      ANIMATING: 'animating',        // During match animation
      READY: 'ready',               // Game elements created, waiting for start
      IN_PROGRESS: 'in_progress',   // Active gameplay
      FINISHED: 'finished'
    };
    
    this.disconnectReasons = {
      BROWSER_REFRESH: 'browser_refresh',
      BROWSER_NAVIGATION: 'browser_navigation',
      BROWSER_CLOSE: 'browser_close',
      NETWORK_DISCONNECT: 'network_disconnect',
      UNEXPECTED_DISCONNECT: 'unexpected_disconnect'
    };
  }

  /**
   * Main entry point for browser disconnection handling
   */
  handleBrowserDisconnect(playerId, roomId, disconnectReason = 'unexpected_disconnect') {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.log(`Room ${roomId} not found during browser disconnect`);
      return;
    }

    // Handle as regular 1v1 game
    console.log(`Browser disconnect: Player ${playerId} from room ${roomId} (${disconnectReason})`);
    return this.handle1v1BrowserDisconnect(playerId, roomId, disconnectReason);
  }



  /**
   * Find the actual room where the player is located (not just WebSocket room)
   */
  findPlayerActualRoom(playerId) {
    const allRooms = gameStateManager.getGameState().gameRooms;
    
    for (const [roomId, room] of allRooms) {
      if (room.players && room.players.some(p => p.id === playerId)) {
        return roomId;
      }
    }
    
    return null;
  }

  /**
   * Handle 1v1 browser disconnection
   */
  handle1v1BrowserDisconnect(playerId, roomId, disconnectReason) {
    const player = gameStateManager.getPlayer(playerId);
    if (player) {
      player.isLeaving = true;
      player.disconnectionReason = disconnectReason;
    }
    console.log(`1v1 browser disconnect handled for player ${playerId}`);
  }

  /**
   * Set player connection state in room metadata
   */
  setPlayerConnectionState(playerId, roomId, state) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) return;

    if (!room.metadata.playerStates) {
      room.metadata.playerStates = {};
    }

    room.metadata.playerStates[playerId] = {
      state,
      timestamp: Date.now()
    };

    console.log(`🏖️ Player ${playerId} state set to ${state} in room ${roomId}`);
  }

  /**
   * Get player connection state from room metadata
   */
  getPlayerConnectionState(playerId, roomId) {
    const room = gameStateManager.getRoom(roomId);
    if (!room || !room.metadata.playerStates) {
      return this.connectionStates.CONNECTING;
    }

    return room.metadata.playerStates[playerId]?.state || this.connectionStates.CONNECTING;
  }

  /**
   * Check if a disconnection should trigger forfeit logic
   */
  shouldTriggerForfeit(playerId, roomId) {
    const state = this.getPlayerConnectionState(playerId, roomId);
    
    // Trigger forfeit for any state except CONNECTING (initial connection)
    return state !== this.connectionStates.CONNECTING;
  }

  /**
   * Setup enhanced WebSocket disconnect handlers with browser disconnect detection
   */
  setupBrowserDisconnectHandlers(ws, playerId, roomId) {
    // Set initial connection state
    this.setPlayerConnectionState(playerId, roomId, this.connectionStates.CONNECTING);

    ws.on('close', (code, reason) => {
      console.log(`🏖️ WebSocket closed for player ${playerId} in room ${roomId} (code: ${code}, reason: ${reason})`);
      
      // Determine disconnect reason based on close code
      let disconnectReason = this.disconnectReasons.UNEXPECTED_DISCONNECT;
      
      if (code === 1000) {
        disconnectReason = this.disconnectReasons.BROWSER_NAVIGATION;
      } else if (code === 1001) {
        disconnectReason = this.disconnectReasons.BROWSER_CLOSE;
      } else if (code === 1006) {
        disconnectReason = this.disconnectReasons.NETWORK_DISCONNECT;
      }



      this.handleBrowserDisconnect(playerId, roomId, disconnectReason);
    });

    ws.on('error', (error) => {
      console.error(`🏖️ WebSocket error for player ${playerId}:`, error);
      this.handleBrowserDisconnect(playerId, roomId, this.disconnectReasons.NETWORK_DISCONNECT);
    });
  }

  /**
   * Handle page unload events (called from client-side)
   */
  handlePageUnload(playerId, roomId) {
    console.log(`🏖️ Page unload detected for player ${playerId} in room ${roomId}`);
    this.handleBrowserDisconnect(playerId, roomId, this.disconnectReasons.BROWSER_NAVIGATION);
  }

  /**
   * Handle browser refresh events (called from client-side)
   */
  handleBrowserRefresh(playerId, roomId) {
    console.log(`🏖️ Browser refresh detected for player ${playerId} in room ${roomId}`);
    this.handleBrowserDisconnect(playerId, roomId, this.disconnectReasons.BROWSER_REFRESH);
  }


}

// Export singleton instance
export const browserDisconnectHandler = new BrowserDisconnectHandler(); 