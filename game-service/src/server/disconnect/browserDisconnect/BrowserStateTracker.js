// This file doesn't need to import BrowserDisconnectHandler since it's just a utility
// The import was causing a circular dependency issue

/**
 * Browser State Tracker
 * Tracks connection states on the client side and sends updates to server
 */
export class BrowserStateTracker {
  constructor() {
    this.connectionStates = {
      CONNECTING: 'connecting',
      LOADING: 'loading',           // During splash screen
      ANIMATING: 'animating',        // During match animation
      READY: 'ready',               // Game elements created, waiting for start
      IN_PROGRESS: 'in_progress',   // Active gameplay
      FINISHED: 'finished'
    };
  }

  /**
   * Update player connection state on server
   */
  updatePlayerState(playerId, roomId, state, clientConnection) {
    if (!clientConnection || !clientConnection.socket || clientConnection.socket.readyState !== WebSocket.OPEN) {
      console.warn(`🏖️ Cannot update player state to ${state} - WebSocket not ready`);
      return;
    }

    try {
      clientConnection.send({
        type: 'updatePlayerState',
        playerId,
        roomId,
        state,
        timestamp: Date.now()
      });
      console.log(`🏖️ Sent player state update: ${state} for player ${playerId} in room ${roomId}`);
    } catch (error) {
      console.error(`🏖️ Error sending player state update:`, error);
    }
  }

  /**
   * Set player state to LOADING (during splash screen)
   */
  setLoadingState(playerId, roomId, clientConnection) {
    this.updatePlayerState(playerId, roomId, this.connectionStates.LOADING, clientConnection);
  }

  /**
   * Set player state to ANIMATING (during match animation)
   */
  setAnimatingState(playerId, roomId, clientConnection) {
    this.updatePlayerState(playerId, roomId, this.connectionStates.ANIMATING, clientConnection);
  }

  /**
   * Set player state to READY (game elements created, waiting for start)
   */
  setReadyState(playerId, roomId, clientConnection) {
    this.updatePlayerState(playerId, roomId, this.connectionStates.READY, clientConnection);
  }

  /**
   * Set player state to IN_PROGRESS (active gameplay)
   */
  setInProgressState(playerId, roomId, clientConnection) {
    this.updatePlayerState(playerId, roomId, this.connectionStates.IN_PROGRESS, clientConnection);
  }

  /**
   * Set player state to FINISHED (game ended)
   */
  setFinishedState(playerId, roomId, clientConnection) {
    this.updatePlayerState(playerId, roomId, this.connectionStates.FINISHED, clientConnection);
  }
}

// Export singleton instance
export const browserStateTracker = new BrowserStateTracker(); 