/**
 * Tournament Client Handler
 * Client-side tournament management for game client
 */

import * as BABYLON from '@babylonjs/core';
import { browserEventHandler } from "../../webSocketClient/BrowserEventHandler.js";
import { stopForfeitWinnerPing } from "../../ui/waitingStatusHandler.js";
import { frontendAssetDisposalManager } from "../../assetManagement/FrontendAssetDisposalManager.js";
import { removeSplashScreen, isSplashScreenActive, MatchType } from "../../ui/splashScreen.js";
import { soundManager } from "../../audio/soundManager.js";

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
      
      // ⭐ CRITICAL FIX: Remove any active splash screen first to prevent race conditions
      if (isSplashScreenActive()) {
        console.log('🏆 Active splash screen detected, removing it immediately');
        removeSplashScreen();
      }
      
      // 🛑 NEW: Stop render loop before asset disposal (handle null game elements)
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
      } else {
        // If map doesn't exist yet (during splash screen), try to stop any running render loops
        console.log('🏆 No map engine found, attempting to stop any running render loops...');
        
        // Try to find any running render loops and stop them
        const canvas = document.querySelector('canvas');
        if (canvas) {
          // Clear the canvas
          const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (ctx) {
            ctx.clearColor(0, 0, 0, 1);
            ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
            console.log('🧹 Canvas cleared for tournament advancement (no map engine)');
          }
        }
      }
      
      // Dispose assets before transferring to final (handle null game elements)
      try {
        const assetsToDispose = {
          ball: gameState.ball || null,
          player1: gameState.player1 || null,
          player2: gameState.player2 || null,
          map: gameState.map || null,
          scene: gameState.map?.getScene || null
        };
        
        await frontendAssetDisposalManager.disposeBetweenMatches(assetsToDispose);
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
      
      // Play semi-final advancement sounds based on final type
      // ⭐ FIX: Only play semi-final sounds for actual semi-final advancements, not forfeit scenarios
      if (message.matchData?.matchType === 'tournament_forfeit') {
        // This is a forfeit scenario, don't play semi-final sounds
        console.log('🏆 Forfeit scenario detected, skipping semi-final sounds');
        updateGameStatus('🎉 You advanced to the final due to opponent disconnect!');
      } else {
        // This is an actual semi-final advancement, play appropriate sounds
        if (message.finalType === 'winner') {
          soundManager.playSound('semiFinalWin', 1.0);
          updateGameStatus('🥇 You advanced to the Winner Final!');
        } else if (message.finalType === 'loser') {
          soundManager.playSound('semiFinalLose', 1.0);
          updateGameStatus('🥉 You advanced to the Loser Final!');
        } else {
          // Fallback for unknown final type
          soundManager.playSound('semiFinalWin', 1.0);
          updateGameStatus('🎉 You advanced to the final!');
        }
      }
    } else if (message.status === 'final_match_complete') {
      // Individual final match is complete
      console.log('🏆 Final match complete, stopping render loop...');
      
      // ⭐ CRITICAL FIX: Remove any active splash screen first to prevent race conditions
      if (isSplashScreenActive()) {
        console.log('🏆 Active splash screen detected, removing it immediately');
        removeSplashScreen();
      }
      
      // 🛑 NEW: Stop render loop before cleanup (handle null game elements)
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
      } else {
        // If map doesn't exist yet, try to clear any canvas
        console.log('🏆 No map engine found for final match completion, clearing canvas...');
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (ctx) {
            ctx.clearColor(0, 0, 0, 1);
            ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
            console.log('🧹 Canvas cleared for final match completion (no map engine)');
          }
        }
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
      
      // ⭐ CRITICAL FIX: Remove any active splash screen first to prevent race conditions
      if (isSplashScreenActive()) {
        console.log('🏆 Active splash screen detected, removing it immediately');
        removeSplashScreen();
      }
      
      // 🛑 NEW: Stop render loop before final cleanup (handle null game elements)
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
      } else {
        // If map doesn't exist yet, try to clear any canvas
        console.log('🏆 No map engine found for tournament completion, clearing canvas...');
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (ctx) {
            ctx.clearColor(0, 0, 0, 1);
            ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
            console.log('🧹 Canvas cleared for tournament completion (no map engine)');
          }
        }
      }
      
      gameState.isGameOver = true;
      gameState.isGameLoopRunning = false;
      
      // Dispose all assets at tournament end (handle null game elements)
      try {
        const assetsToDispose = {
          ball: gameState.ball || null,
          player1: gameState.player1 || null,
          player2: gameState.player2 || null,
          map: gameState.map || null,
          scene: gameState.map?.getScene || null
        };
        
        await frontendAssetDisposalManager.disposeAtTournamentEnd(assetsToDispose);
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
    console.log('🏆 TournamentClientHandler.handleGameInit called with message:', message);
    
    if (message.type === 'gameInit' && (
      message.matchType === 'tournament_semi_final' ||
      message.matchType === 'tournament_winner_final' ||
      message.matchType === 'tournament_loser_final'
    )) {
      let matchTypeText = '';
      let matchType = MatchType.VERSUS; // Default fallback
      
      switch (message.matchType) {
        case 'tournament_semi_final':
          matchTypeText = '🏆 Tournament Semi-Final';
          matchType = MatchType.SEMI_FINALS;
          break;
        case 'tournament_winner_final':
          matchTypeText = '🥇 Winner Final';
          matchType = MatchType.WINNER_FINALS;
          break;
        case 'tournament_loser_final':
          matchTypeText = '🥉 Loser Final';
          matchType = MatchType.LOSER_FINALS;
          break;
      }
      
      console.log(`🏆 ${matchTypeText} starting for ${message.playerName} vs ${message.opponentName}`);
      updateGameStatus(`${matchTypeText} starting...`);
      
      // Show splash screen for tournament match
      try {
        const { showSplashScreen } = await import('../../ui/splashScreen.js');
        console.log('🏆 Showing splash screen for tournament match...');
        await showSplashScreen(message.playerName, message.opponentName, 3000, matchType);
        console.log('🏆 Splash screen completed');
      } catch (error) {
        console.error('Error showing tournament splash screen:', error);
      }
      
      if (gameClient && typeof gameClient.initializeTournamentGame === 'function') {
        
        // Check if the game client has already received a tournament advancement message
        if ((gameClient as any).tournamentAdvancementReceived) {
          
          if (message.matchType === 'tournament_winner_final' || message.matchType === 'tournament_loser_final') {
            (gameClient as any).tournamentAdvancementReceived = false;
          } else {
            return;
          }
        } else {
          console.log('🏆 Tournament advancement flag is false, proceeding with game initialization');
        }
        
        // ⭐ CRITICAL FIX: Add error handling and retry logic for game initialization
        try {
          await gameClient.initializeTournamentGame(message);
          console.log('🏆 gameClient.initializeTournamentGame completed successfully');
        } catch (error) {
          console.error('🏆 Error in initializeTournamentGame, attempting retry...', error);
          
          // ⭐ CRITICAL FIX: Retry game initialization after a short delay
          setTimeout(async () => {
            try {
              console.log('🏆 Retrying gameClient.initializeTournamentGame...');
              await gameClient.initializeTournamentGame(message);
              console.log('🏆 gameClient.initializeTournamentGame completed on retry');
            } catch (retryError) {
              console.error('🏆 Failed to initialize tournament game on retry:', retryError);
              updateGameStatus('Error starting match, please refresh the page');
            }
          }, 1000); // 1 second delay before retry
        }
      } else {
        console.error('🏆 GameClient or initializeTournamentGame method not available');
        updateGameStatus('Error: Game client not available');
      }
    } else {
      console.log('🏆 Message is not a tournament gameInit:', message);
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