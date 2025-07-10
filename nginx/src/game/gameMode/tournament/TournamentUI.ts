/**
 * Tournament UI Manager
 * Handles tournament-specific UI operations
 */

export class TournamentUI {
  /**
   * Update the UI to show waiting room status
   */
  static updateTournamentWaitingRoomUI(data: any): void {
    const container = document.getElementById('app-container');
    if (container) {
      const statusDiv = container.querySelector('.tournament-status') || this.createTournamentStatusElement();
      statusDiv.innerHTML = `
        <div class="tournament-waiting-room">
          <h3>🏆 Tournament Waiting Room</h3>
          <p>Players: ${data.playerCount}/${data.maxPlayers}</p>
          <p>${data.message || 'Waiting for more players...'}</p>
          <button onclick="leaveGame()" class="leave-tournament-btn">Leave Tournament</button>
        </div>
      `;
    }
  }

  /**
   * Create tournament status element
   */
  static createTournamentStatusElement(): HTMLElement {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'tournament-status';
    statusDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px;
      border-radius: 8px;
      z-index: 1000;
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(statusDiv);
    return statusDiv;
  }

  /**
   * Show tournament loading state
   */
  static showTournamentLoading(): void {
    const container = document.getElementById('app-container');
    if (container) {
      container.innerHTML = `
        <div class="tournament-loading">
          <h3>🏆 Joining Tournament...</h3>
          <div class="loading-spinner"></div>
          <p>Please wait while we connect you to the tournament.</p>
        </div>
      `;
    }
  }

  /**
   * Show tournament error state
   */
  static showTournamentError(message: string): void {
    const container = document.getElementById('app-container');
    if (container) {
      container.innerHTML = `
        <div class="tournament-error">
          <h3>🏆 Tournament Error</h3>
          <p>${message}</p>
          <button onclick="window.location.reload()" class="retry-btn">Retry</button>
        </div>
      `;
    }
  }
} 