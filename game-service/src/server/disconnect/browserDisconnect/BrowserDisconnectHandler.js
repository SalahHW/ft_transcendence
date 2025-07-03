import { gameStateManager } from '../../../game/GameStateManager.js';
import { tournamentDisconnectionHandler } from '../tournament/TournamentDisconnectHandler.js';
import { TournamentDisconnectUtils } from '../tournament/utils/TournamentDisconnectUtils.js';

/**
 * Browser Disconnect Handler
 * Detects disconnections during loading/transition states and routes to existing tournament flow
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
      UNEXPECTED_DISCONNECT: 'unexpected_disconnect',
      FINAL_DISCONNECT: 'final_disconnect',
      WINNERS_FINAL_DISCONNECT: 'winners_final_disconnect',
      LOSERS_FINAL_DISCONNECT: 'losers_final_disconnect'
    };
  }

  /**
   * Main entry point for browser disconnection handling
   * Routes to appropriate handler based on room type and connection state
   */
  handleBrowserDisconnect(playerId, roomId, disconnectReason = 'unexpected_disconnect') {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.log(`🏖️ Room ${roomId} not found during browser disconnect`);
      return;
    }

    // Check if this is a tournament room
    const isTournamentRoom = TournamentDisconnectUtils.isTournamentRoom(room);
    
    if (isTournamentRoom) {
      console.log(`🏆🔥 BROWSER DISCONNECT: Player ${playerId} from tournament room ${roomId} (${disconnectReason})`);
      return this.handleTournamentBrowserDisconnect(playerId, roomId, disconnectReason);
    }

    // Handle as regular 1v1 game (for future implementation)
    console.log(`🎮🔥 BROWSER DISCONNECT: Player ${playerId} from 1v1 room ${roomId} (${disconnectReason})`);
    return this.handle1v1BrowserDisconnect(playerId, roomId, disconnectReason);
  }

  /**
   * Handle tournament browser disconnection
   * Routes to existing tournament disconnect flow with browser-specific context
   */
  handleTournamentBrowserDisconnect(playerId, roomId, disconnectReason) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) return;

    const player = gameStateManager.getPlayer(playerId);
    
    // 🏆 CRITICAL FIX: Check if player is actually in a semi-final room, even if WebSocket is from waiting room
    const actualRoomId = this.findPlayerActualRoom(playerId);
    const actualRoom = actualRoomId ? gameStateManager.getRoom(actualRoomId) : null;
    
    let targetRoomId = roomId;
    let targetRoom = room;
    
    // If player is actually in a semi-final room, use that instead of the WebSocket room
    if (actualRoom && TournamentDisconnectUtils.getTournamentRoomType(actualRoom) === 'semifinal') {
      console.log(`🏆🔥 BROWSER DISCONNECT: Player ${playerId} is actually in semi-final room ${actualRoomId}, not WebSocket room ${roomId}`);
      targetRoomId = actualRoomId;
      targetRoom = actualRoom;
    }
    
    // If player is actually in a final room, use that instead of the WebSocket room
    if (actualRoom && TournamentDisconnectUtils.getTournamentRoomType(actualRoom) === 'final') {
      console.log(`🏆🔥 BROWSER DISCONNECT: Player ${playerId} is actually in final room ${actualRoomId}, not WebSocket room ${roomId}`);
      targetRoomId = actualRoomId;
      targetRoom = actualRoom;
    }
    
    const roomType = TournamentDisconnectUtils.getTournamentRoomType(targetRoom);
    console.log(`🏆🔥 BROWSER DISCONNECT: Using room ${targetRoomId} (type: ${roomType}) for player ${playerId}`);
    
    // Mark player as leaving due to browser disconnect
    if (player) {
      player.isLeaving = true;
      player.disconnectionReason = disconnectReason;
    }

    // Route to existing tournament disconnect handler with the correct room
    // This ensures we use all the existing forfeit logic and tournament progression
    return tournamentDisconnectionHandler.handleTournamentPlayerDisconnect(playerId, targetRoomId);
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
   * Handle 1v1 browser disconnection (placeholder for future implementation)
   */
  handle1v1BrowserDisconnect(playerId, roomId, disconnectReason) {
    // TODO: Implement 1v1 browser disconnect handling
    console.log(`🎮 1v1 browser disconnect handling not yet implemented for player ${playerId}`);
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

      // 🏆 ENHANCED: Add final-specific disconnect reason detection
      const actualRoomId = this.findPlayerActualRoom(playerId);
      const actualRoom = actualRoomId ? gameStateManager.getRoom(actualRoomId) : null;
      
      if (actualRoom && TournamentDisconnectUtils.getTournamentRoomType(actualRoom) === 'final') {
        const finalMatchType = actualRoom.metadata?.finalMatch;
        if (finalMatchType === 'winners') {
          disconnectReason = this.disconnectReasons.WINNERS_FINAL_DISCONNECT;
        } else if (finalMatchType === 'losers') {
          disconnectReason = this.disconnectReasons.LOSERS_FINAL_DISCONNECT;
        } else {
          disconnectReason = this.disconnectReasons.FINAL_DISCONNECT;
        }
        console.log(`🏆 Final disconnect detected: ${disconnectReason} for ${finalMatchType} final`);
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

  /**
   * Handle final-specific browser disconnection
   */
  handleFinalBrowserDisconnect(playerId, roomId, finalMatchType = 'unknown') {
    let disconnectReason = this.disconnectReasons.FINAL_DISCONNECT;
    
    if (finalMatchType === 'winners') {
      disconnectReason = this.disconnectReasons.WINNERS_FINAL_DISCONNECT;
    } else if (finalMatchType === 'losers') {
      disconnectReason = this.disconnectReasons.LOSERS_FINAL_DISCONNECT;
    }
    
    console.log(`🏆 Final browser disconnect detected for player ${playerId} in ${finalMatchType} final`);
    this.handleBrowserDisconnect(playerId, roomId, disconnectReason);
  }
}

// Export singleton instance
export const browserDisconnectHandler = new BrowserDisconnectHandler(); 