/**
 * Tournament Client Handler
 * Client-side tournament management for game client
 */

import * as BABYLON from '@babylonjs/core';
import { browserEventHandler } from "../../webSocketClient/BrowserEventHandler.js";
import { stopForfeitWinnerPing } from "../../ui/waitingStatusHandler.js";
import { frontendAssetDisposalManager } from "../../assetManagement/FrontendAssetDisposalManager.js";

export class TournamentClientHandler {
  /**
   * Handle tournament advancement messages
   */
  static async handleTournamentAdvancement(
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
  ): Promise<void> {
    if (message.status === 'transferred_to_final') {
      console.log('🏆 Tournament advancement detected, stopping render loop...');
      
      // 🛑 NEW: Stop render loop before asset disposal
      if (gameState.map?.getEngine) {
        gameState.map.getEngine.stopRenderLoop();
        
        // Clear the canvas to remove the last frame
        if (gameState.map.canvas && gameState.map.getEngine) {
          const engine = gameState.map.getEngine;
          engine.clear(new BABYLON.Color4(0, 0, 0, 1), true, true, true);
          console.log('🧹 WebGL canvas cleared for tournament advancement');
        }
        
        // Wait for render loop to stop
        await new Promise(resolve => requestAnimationFrame(resolve));
        console.log('🛑 Render loop stopped for tournament advancement');
      }
      
      // Dispose assets before transferring to final
      try {
        await frontendAssetDisposalManager.disposeBetweenMatches({
          ball: gameState.ball,
          player1: gameState.player1,
          player2: gameState.player2,
          map: gameState.map,
          scene: gameState.map?.getScene
        });
        console.log('🧹 Frontend: Assets disposed before transfer to final (render loop stopped)');
      } catch (error) {
        console.error('🧹 Frontend: Error disposing assets before final transfer:', error);
      }

      // Reset game state for final match
      gameState.isGameOver = false;
      gameState.isGameLoopRunning = false;
      gameState.map = null;
      gameState.ball = null;
      gameState.player1 = null;
      gameState.player2 = null;
      
      // Update status with specific final type
      if (message.finalType === 'winner') {
        updateGameStatus('🥇 You advanced to the Winner Final!');
      } else if (message.finalType === 'loser') {
        updateGameStatus('🥉 You advanced to the Loser Final!');
      } else {
        updateGameStatus('🎉 You advanced to the final!');
      }
    } else if (message.status === 'final_match_complete') {
      // Individual final match is complete
      console.log('🏆 Final match complete, stopping render loop...');
      
      // 🛑 NEW: Stop render loop before cleanup
      if (gameState.map?.getEngine) {
        gameState.map.getEngine.stopRenderLoop();
        
        // Clear the canvas to remove the last frame
        if (gameState.map.canvas && gameState.map.getEngine) {
          const engine = gameState.map.getEngine;
          engine.clear(new BABYLON.Color4(0, 0, 0, 1), true, true, true);
          console.log('🧹 WebGL canvas cleared for final match completion');
        }
        
        await new Promise(resolve => requestAnimationFrame(resolve));
        console.log('🛑 Render loop stopped for final match completion');
      }
      
      gameState.isGameOver = true;
      gameState.isGameLoopRunning = false;
      
      // Stop the browser event handler heartbeat for eliminated players (3rd and 4th place)
      if (message.playerPlacement && message.playerPlacement >= 3) {
        browserEventHandler.stopHeartbeatPublic();
        stopForfeitWinnerPing();
        console.log(`💓 Stopped all keep-alive mechanisms for eliminated player (${message.playerPlacement}${message.playerPlacement === 3 ? 'rd' : 'th'} place)`);
      }
      
      // Show appropriate tournament end splash screen
      if (message.playerPlacement) {
        try {
          const { showTournamentEndSplashScreen } = await import('../../utils/tournamentSplashScreenUtils.js');
          await showTournamentEndSplashScreen(message.playerPlacement);
        } catch (error) {
          console.error('Error showing tournament end splash screen:', error);
          updateGameStatus('🏆 Final match complete!');
        }
      } else {
        updateGameStatus('🏆 Final match complete!');
      }
    } else if (message.status === 'tournament_complete') {
      // Tournament is complete (both finals finished)
      console.log('🏆 Tournament complete, stopping render loop...');
      
      // 🛑 NEW: Stop render loop before final cleanup
      if (gameState.map?.getEngine) {
        gameState.map.getEngine.stopRenderLoop();
        
        // Clear the canvas to remove the last frame
        if (gameState.map.canvas && gameState.map.getEngine) {
          const engine = gameState.map.getEngine;
          engine.clear(new BABYLON.Color4(0, 0, 0, 1), true, true, true);
          console.log('🧹 WebGL canvas cleared for tournament completion');
        }
        
        await new Promise(resolve => requestAnimationFrame(resolve));
        console.log('🛑 Render loop stopped for tournament completion');
      }
      
      gameState.isGameOver = true;
      gameState.isGameLoopRunning = false;
      
      // Dispose all assets at tournament end
      try {
        await frontendAssetDisposalManager.disposeAtTournamentEnd({
          ball: gameState.ball,
          player1: gameState.player1,
          player2: gameState.player2,
          map: gameState.map,
          scene: gameState.map?.getScene
        });
        console.log('🧹 Frontend: Assets disposed at tournament end (render loop stopped)');
      } catch (error) {
        console.error('🧹 Frontend: Error disposing assets at tournament end:', error);
      }
      
      // Stop all keep-alive mechanisms to prevent keep-alive messages
      browserEventHandler.stopHeartbeatPublic();
      stopForfeitWinnerPing();
      console.log('💓 Stopped all keep-alive mechanisms due to tournament completion');
      
      // The splash screen should already be shown from the individual final match completion
      // Just update the status if needed
      if (message.message) {
        updateGameStatus(message.message);
      }
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
    if (message.type === 'gameInit' && (
      message.matchType === 'tournament_semi_final' ||
      message.matchType === 'tournament_winner_final' ||
      message.matchType === 'tournament_loser_final'
    )) {
      let matchTypeText = '';
      switch (message.matchType) {
        case 'tournament_semi_final':
          matchTypeText = '🏆 Tournament Semi-Final';
          break;
        case 'tournament_winner_final':
          matchTypeText = '🥇 Winner Final';
          break;
        case 'tournament_loser_final':
          matchTypeText = '🥉 Loser Final';
          break;
      }
      
      updateGameStatus(`${matchTypeText} starting...`);
      
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