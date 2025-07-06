/**
 * Tournament Lifecycle Manager
 * Handles tournament lifecycle events and player state management
 */

/**
 * Tournament Lifecycle Manager
 */
export class TournamentLifecycleManager {
  constructor(tournamentManager) {
    this.tournamentManager = tournamentManager;
  }

  /**
   * Handle tournament player WebSocket connection established
   */
  handlePlayerWebSocketConnected(playerId, waitingRoomId) {
    this.tournamentManager.playerManager.handlePlayerWebSocketConnected(playerId, waitingRoomId);
    
    // Check if tournament has already started and this is a late-connecting player
    const waitingRoomData = this.tournamentManager.waitingRooms.get(waitingRoomId);
    if (waitingRoomData && waitingRoomData.phase === 'SEMI_FINALS') {
      console.log(`🏆 Late-connecting player ${playerId} in tournament ${waitingRoomId}`);
      this.tournamentManager.transferManager.handleLateConnectingPlayer(playerId, waitingRoomId);
    }
  }

  /**
   * Handle player leaving tournament (explicit leave button)
   */
  handlePlayerLeave(playerId, waitingRoomId) {
    const result = this.tournamentManager.playerManager.handlePlayerLeave(playerId, waitingRoomId);
    
    if (result && result.shouldCleanup) {
      this.tournamentManager.cleanupManager.cleanupWaitingRoom(waitingRoomId);
    }
    
    // Notify remaining players
    this.tournamentManager.communicationManager.broadcastWaitingRoomStatus(waitingRoomId);
  }

  /**
   * Update player activity timestamp
   */
  updatePlayerActivity(playerId, waitingRoomId) {
    this.tournamentManager.playerManager.updatePlayerActivity(playerId, waitingRoomId);
  }
} 