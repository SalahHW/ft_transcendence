import { webSocketClient } from './webSocketClient.js';

/**
 * Client-side state tracker for disconnect handling
 * Sends player state updates to server for proper disconnect detection
 */

export class StateTracker {
  private clientConnection: webSocketClient | null = null;
  private currentState: string = 'waiting';
  private roomId: string | null = null;
  private playerId: string | null = null;

  /**
   * Initialize state tracker
   */
  initialize(clientConnection: webSocketClient, playerId: string, roomId: string): void {
    this.clientConnection = clientConnection;
    this.playerId = playerId;
    this.roomId = roomId;
    this.currentState = 'waiting';
    

  }

  /**
   * Update player state and send to server
   */
  updateState(newState: string): void {
    if (!this.clientConnection || !this.playerId || !this.roomId) {
      console.warn('State tracker not initialized');
      return;
    }

    if (this.currentState === newState) {
      return; // No change
    }

    console.log(`🔄 State change: ${this.currentState} → ${newState}`);
    this.currentState = newState;

    try {
      this.clientConnection.send({
        type: 'updatePlayerState',
        playerId: this.playerId,
        roomId: this.roomId,
        state: newState,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error sending state update:', error);
    }
  }

  /**
   * Set state to waiting for opponent
   */
  setWaitingState(): void {
    this.updateState('waiting');
  }

  /**
   * Set state to loading screen
   */
  setLoadingState(): void {
    this.updateState('loading');
  }

  /**
   * Set state to announcement screen
   */
  setAnnouncementState(): void {
    this.updateState('announcement');
  }

  /**
   * Set state to launch animation
   */
  setLaunchAnimationState(): void {
    this.updateState('launch_animation');
  }

  /**
   * Set state to playing
   */
  setPlayingState(): void {
    this.updateState('playing');
  }

  /**
   * Set state to game over
   */
  setGameOverState(): void {
    this.updateState('game_over');
  }

  /**
   * Get current state
   */
  getCurrentState(): string {
    return this.currentState;
  }

  /**
   * Update room ID after initialization
   */
  updateRoomId(newRoomId: string): void {
    this.roomId = newRoomId;
    console.log(`🔄 State tracker room ID updated to: ${newRoomId}`);
  }

  /**
   * Clean up state tracker
   */
  cleanup(): void {
    this.clientConnection = null;
    this.playerId = null;
    this.roomId = null;
    this.currentState = 'waiting';
    console.log('🧹 State tracker cleaned up');
  }
}

// Export singleton instance
export const stateTracker = new StateTracker(); 