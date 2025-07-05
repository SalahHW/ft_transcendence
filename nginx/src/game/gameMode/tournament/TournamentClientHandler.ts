/**
 * Tournament Client Handler
 * Client-side tournament management for game client
 */

export class TournamentClientHandler {
  /**
   * Handle tournament advancement messages
   */
  static handleTournamentAdvancement(
    message: any, 
    updateGameStatus: (status: string) => void,
    gameState: {
      isGameOver: boolean;
      isGameLoopRunning: boolean;
      map: any;
      ball: any;
      player1: any;
      player2: any;
    }
  ): void {
    if (message.status === 'transferred_to_final') {
      updateGameStatus('🎉 You advanced to the final!');
    } else if (message.status === 'tournament_complete') {
      updateGameStatus('🏆 Tournament complete!');
    }
  }

  /**
   * Handle match assignment message from server
   */
  static handleMatchAssignment(
    message: any,
    updateGameStatus: (status: string) => void
  ): void {
    if (message.type === 'matchAssignment') {
      updateGameStatus(`🏆 You've been assigned to ${message.matchType} match!`);
      
      // Store match information for later use
      (window as any).tournamentMatchInfo = {
        roomId: message.roomId,
        opponentId: message.opponentId,
        opponentUsername: message.opponentUsername,
        matchType: message.matchType
      };
    }
  }

  /**
   * Handle game initialization for tournament matches
   */
  static async handleGameInit(
    message: any,
    updateGameStatus: (status: string) => void,
    gameClient: any
  ): Promise<void> {
    if (message.type === 'gameInit' && message.matchType === 'tournament_semi_final') {
      updateGameStatus('🏆 Tournament Semi-Final starting...');
      
      // Show splash screen for tournament match
      try {
        const { showSplashScreen } = await import('../../ui/splashScreen.js');
        await showSplashScreen(message.playerName, message.opponentName, 3000);
      } catch (error) {
        console.error('Error showing tournament splash screen:', error);
      }
      
      // Initialize tournament game with the provided data
      if (gameClient && typeof gameClient.initializeTournamentGame === 'function') {
        await gameClient.initializeTournamentGame(message);
      } else {
        console.error('🏆 GameClient or initializeTournamentGame method not available');
      }
    }
  }

  /**
   * Handle hiding game elements during tournament transitions
   */
  static handleHideGameElements(
    message: any,
    updateGameStatus: (status: string) => void,
    gameElements: {
      ball: any;
      player1: any;
      player2: any;
    }
  ): void {
    // Hide ball during transitions
    if (gameElements.ball?.ballBody) {
      gameElements.ball.ballBody.isVisible = false;
    }
    
    // Keep players visible but could add transition effects here
  }

  /**
   * Reset tournament game state for new matches
   */
  static resetTournamentGameState(gameState: {
    isGameOver: boolean;
    isGameLoopRunning: boolean;
  }  ): void {
    gameState.isGameOver = false;
    gameState.isGameLoopRunning = false;
  }

  /**
   * Ensure all tournament game elements are visible
   */
  static ensureTournamentElementsVisible(gameElements: {
    ball: any;
    player1: any;
    player2: any;
  }  ): void {
    // Ensure players are visible
    if (gameElements.player1?.paddleBody) {
      gameElements.player1.paddleBody.isVisible = true;
    }
    if (gameElements.player2?.paddleBody) {
      gameElements.player2.paddleBody.isVisible = true;
    }
    
    // Ball visibility will be managed by the server
  }
} 