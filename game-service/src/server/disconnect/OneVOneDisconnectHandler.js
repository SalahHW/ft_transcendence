/**
 * 1v1 specific disconnect handler
 * Handles disconnections for 1v1 matches with state-based forfeit logic
 */

import { BaseDisconnectHandler, PlayerStates, DisconnectionReasons, MatchTypes } from './BaseDisconnectHandler.js';
import { gameStateManager } from '../../game/GameStateManager.js';
import { gameEngine } from '../../game/GameEngine.js';
import { LogUtils, TimeUtils } from '../../utils/helpers.js';
import { playerManager } from '../../player/PlayerManager.js';
import { reportMatchResultsToAPI } from '../api.js';
import { GAME_CONFIG } from '../../core/constants.js';
import { blockchainService } from '../../services/blockchainService.js';

/**
 * 1v1 specific disconnect handler
 */
export class OneVOneDisconnectHandler extends BaseDisconnectHandler {
  constructor() {
    super();
    this.matchType = MatchTypes.ONE_V_ONE;
  }

  /**
   * Handle unexpected disconnection
   */
  handleDisconnection(playerId, roomId, reason) {
    const room = gameStateManager.getRoom(roomId);
    if (!room || !this.shouldHandleDisconnection(room)) {
      this.removePlayerFromGame(playerId);
      return;
    }

    // Clean up player connection first
    this.cleanupPlayerConnection(playerId);
    
    // Get current player state
    const playerState = this.getPlayerState(playerId, roomId);
    
    // Handle based on current state
    switch (playerState) {
      case PlayerStates.WAITING:
        this.handleWaitingStateDisconnect(playerId, roomId, reason);
        break;
      case PlayerStates.LOADING:
      case PlayerStates.ANNOUNCEMENT:
      case PlayerStates.LAUNCH_ANIMATION:
        this.handlePreGameDisconnect(playerId, roomId, reason);
        break;
      case PlayerStates.PLAYING:
        this.handleInGameDisconnect(playerId, roomId, reason);
        break;
      case PlayerStates.GAME_OVER:
        this.handlePostGameDisconnect(playerId, roomId);
        break;
      default:
        console.warn(`Unknown player state: ${playerState} for player ${playerId}`);
        this.handleWaitingStateDisconnect(playerId, roomId, reason);
    }
  }

  /**
   * Handle explicit leave game button click
   */
  handleExplicitLeave(playerId, roomId) {
    // Mark player as leaving
    playerManager.markPlayerLeaving(playerId);
    
    // Handle as disconnection with explicit reason
    this.handleDisconnection(playerId, roomId, DisconnectionReasons.PLAYER_LEFT);
  }

  /**
   * Handle disconnection during waiting state
   */
  handleWaitingStateDisconnect(playerId, roomId, reason) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) return;

    // Clear wallet cache for disconnected player
    blockchainService.clearUserWalletCache(playerId);

    // Check if game has started but is in animation phase
    if (room.gameStarted && room.ready) {
      this.handlePreGameDisconnect(playerId, roomId, reason);
      return;
    }

    // Remove player from room
    room.players = room.players.filter(p => p.id !== playerId);
    
    // Handle empty rooms
    if (room.players.length === 0) {
      gameStateManager.removeRoom(roomId);
    } else {
      // Notify remaining player
      this.notifyPlayerDisconnected(roomId, playerId, room.players.length);
    }
  }

  /**
   * Handle disconnection during pre-game states (loading, announcement, launch animation)
   */
  async handlePreGameDisconnect(playerId, roomId, reason) {
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`Could not find players in room ${roomId} for pre-game disconnect handling`);
      return;
    }

    // ⭐ FIX: Capture scores before disposing ball assets
    let winnerScore = null;
    let loserScore = null;
    
    if (room.ball) {
      const isRemainingPlayer1 = remainingPlayer.id === room.players[0].id;
      const isDisconnectedPlayer1 = disconnectedPlayer.id === room.players[0].id;
      
      winnerScore = GAME_CONFIG.WINNING_SCORE; // Winner always gets full score
      loserScore = isDisconnectedPlayer1 ? room.ball.player1.playerScore : room.ball.player2.playerScore;
    }

    // ⭐ FIX: Dispose ball assets to prevent memory leaks
    await this.disposeBallAssets(room, roomId);

    // Award forfeit win with captured scores
    await this.awardForfeitWin(room, roomId, remainingPlayer, disconnectedPlayer, reason, 'pre_game', winnerScore, loserScore);
  }

  /**
   * Handle disconnection during active gameplay
   */
  async handleInGameDisconnect(playerId, roomId, reason) {
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`Could not find players in room ${roomId} for in-game disconnect handling`);
      return;
    }

    // ⭐ FIX: Capture scores before disposing ball assets
    let winnerScore = null;
    let loserScore = null;
    
    if (room.ball) {
      const isRemainingPlayer1 = remainingPlayer.id === room.players[0].id;
      const isDisconnectedPlayer1 = disconnectedPlayer.id === room.players[0].id;
      
      winnerScore = GAME_CONFIG.WINNING_SCORE; // Winner always gets full score
      loserScore = isDisconnectedPlayer1 ? room.ball.player1.playerScore : room.ball.player2.playerScore;
    }

    // ⭐ FIX: Dispose ball assets to prevent memory leaks
    await this.disposeBallAssets(room, roomId);

    // Award forfeit win with captured scores
    await this.awardForfeitWin(room, roomId, remainingPlayer, disconnectedPlayer, reason, 'in_game', winnerScore, loserScore);
  }

  /**
   * Handle disconnection after game is over
   */
  handlePostGameDisconnect(playerId, roomId) {
    // Just clean up, no special handling needed
    this.removePlayerFromGame(playerId);
    
    const room = gameStateManager.getRoom(roomId);
    if (room && room.players.length === 0) {
      gameStateManager.removeRoom(roomId);
    }
  }

  /**
   * Award forfeit win to remaining player
   */
  async awardForfeitWin(room, roomId, winner, loser, reason, context, winnerScore = null, loserScore = null) {
    // Mark game as over immediately
    room.isGameOver = true;
    
    // Create match data
    const matchData = await this.createForfeitMatchData(room, roomId, winner, loser, reason, context, winnerScore, loserScore);
    
    // Log the forfeit
    LogUtils.logMatchCompletion(matchData);
    
    // Report results to external APIs
    this.reportForfeitResults(matchData);
    
    // Notify remaining player
    this.notifyForfeitWin(roomId, matchData);
    
    // Schedule cleanup
    this.scheduleRoomCleanup(roomId, 5000);
  }

  /**
   * Create match data for forfeit scenarios
   */
  async createForfeitMatchData(room, roomId, winner, loser, reason, context, winnerScore = null, loserScore = null) {
    const matchEndTime = TimeUtils.getCurrentTimestamp();
    const matchStartTime = room.startTime || matchEndTime;
    
    // ⭐ FIX: Use provided scores or calculate correct scores based on player positions
    let finalWinnerScore = winnerScore;
    let finalLoserScore = loserScore;
    
    if (finalWinnerScore === null || finalLoserScore === null) {
      // Calculate scores based on which player is which
      if (room.ball) {
        const isWinnerPlayer1 = winner.id === room.players[0].id;
        const isLoserPlayer1 = loser.id === room.players[0].id;
        
                 finalWinnerScore = finalWinnerScore ?? GAME_CONFIG.WINNING_SCORE; // Winner always gets full score
         finalLoserScore = finalLoserScore ?? ((isLoserPlayer1 ? room.ball.player1.playerScore : room.ball.player2.playerScore) || 0);
      } else {
        finalWinnerScore = finalWinnerScore ?? GAME_CONFIG.WINNING_SCORE;
        finalLoserScore = finalLoserScore ?? 0;
      }
    }
    
    // Generate match ID for blockchain reporting
    let matchId = null;
    try {
      const { blockchainService } = await import('../../services/blockchainService.js');
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Match ID generation timeout')), 3000)
      );
      matchId = await Promise.race([
        blockchainService.generateMatchId(),
        timeoutPromise
      ]);
      console.log(`🎯 Generated match ID ${matchId} for 1v1 forfeit in room ${roomId}`);
    } catch (error) {
      console.error('❌ Failed to generate match ID for 1v1 forfeit:', error.message);
      // Use timestamp as fallback ID
      matchId = Math.floor(Date.now() / 1000) % 1000000;
      console.log(`🎯 Using fallback match ID ${matchId} for 1v1 forfeit in room ${roomId}`);
    }
    
    return {
      roomId,
      matchId, // Add the generated match ID
      matchType: this.matchType,
      matchStartTime,
      matchEndTime,
      matchDuration: TimeUtils.calculateMatchDuration(matchStartTime, matchEndTime),
      winner: {
        id: winner.id,
        username: winner.username || 'Anonymous',
        score: finalWinnerScore
      },
      loser: {
        id: loser.id,
        username: loser.username || 'Anonymous',
        score: finalLoserScore
      },
      gameStats: {
        totalRebounds: room.ball?.rebounds || 0,
        finalScore: `${finalWinnerScore}-${finalLoserScore}`,
        ballSpeed: room.ball?.speed || 0,
        lastHitBy: room.ball?.wasHitByPlayer || null,
        forfeitReason: this.getForfeitReasonText(reason, context),
        disconnectionType: reason,
        context: context
      },
      matchType: 'forfeit',
      disconnectionReason: reason,
      serverTime: Date.now()
    };
  }

  /**
   * Get human-readable forfeit reason
   */
  getForfeitReasonText(reason, context) {
    const contextText = context === 'pre_game' ? 'before the game started' : 'during the game';
    
    switch (reason) {
      case DisconnectionReasons.PLAYER_LEFT:
        return `Player left ${contextText}`;
      case DisconnectionReasons.BROWSER_REFRESH:
        return `Player refreshed browser ${contextText}`;
      case DisconnectionReasons.BROWSER_NAVIGATION:
        return `Player navigated away ${contextText}`;
      case DisconnectionReasons.BROWSER_CLOSE:
        return `Player closed browser ${contextText}`;
      case DisconnectionReasons.NETWORK_DISCONNECT:
        return `Player lost connection ${contextText}`;
      case DisconnectionReasons.TIMEOUT:
        return `Player timed out ${contextText}`;
      default:
        return `Player disconnected ${contextText}`;
    }
  }

  /**
   * Clean up player connection
   */
  cleanupPlayerConnection(playerId) {
    const player = gameStateManager.getPlayer(playerId);
    
    if (player && player.ws) {
      this.cleanupWebSocket(player.ws);
    }
    
    this.removePlayerFromGame(playerId);
  }

  /**
   * Report forfeit results to external APIs
   */
  async reportForfeitResults(matchData) {
    try {
      await reportMatchResultsToAPI(matchData);
    } catch (error) {
      console.error('❌ Failed to report forfeit results:', error);
    }
  }

  /**
   * Notify remaining player of forfeit win
   */
  notifyForfeitWin(roomId, matchData) {
    const message = {
      type: 'gameEnd',
      ...matchData,
      reason: 'opponent_disconnect'
    };

    gameEngine.broadcastToRoom(roomId, message);
  }

  /**
   * Notify players of a disconnection (non-game scenario)
   */
  notifyPlayerDisconnected(roomId, disconnectedPlayerId, remainingPlayerCount) {
    gameEngine.broadcastToRoom(roomId, {
      type: 'playerDisconnected',
      playerId: disconnectedPlayerId,
      remainingPlayers: remainingPlayerCount
    });
  }

  /**
   * Schedule room cleanup with delay
   */
  scheduleRoomCleanup(roomId, delayMs = 5000) {
    setTimeout(() => {
      const room = gameStateManager.getRoom(roomId);
      if (room) {
        gameStateManager.removeRoom(roomId);
      }
    }, delayMs);
  }

  /**
   * Handle player state update from client
   */
  handlePlayerStateUpdate(playerId, roomId, state) {
    if (Object.values(PlayerStates).includes(state)) {
      this.setPlayerState(playerId, roomId, state);
      this.updatePlayerActivity(playerId);
    } else {
      console.warn(`Invalid player state: ${state} for player ${playerId}`);
    }
  }

  /**
   * ⭐ FIX: Dispose ball assets to prevent memory leaks in 1v1 games
   */
  async disposeBallAssets(room, roomId) {
    console.log(`🧹 1v1: Disposing ball assets for room ${roomId}`);
    
    if (room.ball) {
      // Stop ball movement by setting velocity to zero
      if (room.ball.velocity) {
        room.ball.velocity.set(0, 0, 0);
        console.log(`🧹 1v1: Ball velocity set to zero for room ${roomId}`);
      }
      if (room.ball.previousVelocity) {
        room.ball.previousVelocity.set(0, 0, 0);
      }
      
      // Reset ball state to prevent respawning
      room.ball.isRespawning = false;
      room.ball.respawnTime = 0;
      room.ball.hasValidPosition = false;
      
      // Clear ball references to prevent memory leaks
      room.ball.gameEngine = null;
      room.ball.roomId = null;
      
      // ⭐ CRITICAL: Nullify the ball object to stop all movement
      room.ball = null;
      
      console.log(`🧹 1v1: Ball object nullified for room ${roomId}`);
    }
    
    // ⭐ FIX: Set flag to prevent ball recreation
    room.ballDisposed = true;
    console.log(`🧹 1v1: Ball disposal flag set for room ${roomId}`);
    
    // ⭐ FIX: Send final sync message with ballState: null to explicitly stop client processing
    try {
      gameEngine.broadcastToRoom(roomId, {
        type: 'sync',
        playerPositions: {},
        ballState: null,
        serverTime: Date.now(),
        roomId: roomId,
        isDelta: true,
        ballDisposed: true // ⭐ NEW: Flag to indicate ball has been disposed
      });
      console.log(`🧹 1v1: Sent final sync message with ballState: null for room ${roomId}`);
    } catch (error) {
      console.error(`🧹 1v1: Error sending final sync message for room ${roomId}:`, error);
    }
    
    // Clear ball update flags
    room.ballUpdateSent = false;
    if (room.ballUpdateTimeout) {
      clearTimeout(room.ballUpdateTimeout);
      room.ballUpdateTimeout = null;
      console.log(`🧹 1v1: Ball update timeout cleared for room ${roomId}`);
    }
    
    console.log(`🧹 1v1: Ball assets disposal completed for room ${roomId}`);
  }
}

// Export singleton instance
export const oneVOneDisconnectHandler = new OneVOneDisconnectHandler(); 