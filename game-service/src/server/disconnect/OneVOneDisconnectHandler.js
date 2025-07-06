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
  handlePreGameDisconnect(playerId, roomId, reason) {
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`Could not find players in room ${roomId} for pre-game disconnect handling`);
      return;
    }

    // Award forfeit win
    this.awardForfeitWin(room, roomId, remainingPlayer, disconnectedPlayer, reason, 'pre_game');
  }

  /**
   * Handle disconnection during active gameplay
   */
  handleInGameDisconnect(playerId, roomId, reason) {
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`Could not find players in room ${roomId} for in-game disconnect handling`);
      return;
    }

    // Award forfeit win
    this.awardForfeitWin(room, roomId, remainingPlayer, disconnectedPlayer, reason, 'in_game');
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
  awardForfeitWin(room, roomId, winner, loser, reason, context) {
    // Mark game as over immediately
    room.isGameOver = true;
    
    // Create match data
    const matchData = this.createForfeitMatchData(room, roomId, winner, loser, reason, context);
    
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
  createForfeitMatchData(room, roomId, winner, loser, reason, context) {
    const matchEndTime = TimeUtils.getCurrentTimestamp();
    const matchStartTime = room.startTime || matchEndTime;
    
    return {
      roomId,
      matchType: this.matchType,
      matchStartTime,
      matchEndTime,
      matchDuration: TimeUtils.calculateMatchDuration(matchStartTime, matchEndTime),
      winner: {
        id: winner.id,
        username: winner.username || 'Anonymous',
        score: GAME_CONFIG.WINNING_SCORE // Award full score for forfeit win
      },
      loser: {
        id: loser.id,
        username: loser.username || 'Anonymous',
        score: room.ball?.player2?.playerScore || 0
      },
      gameStats: {
        totalRebounds: room.ball?.rebounds || 0,
        finalScore: `${GAME_CONFIG.WINNING_SCORE}-${room.ball?.player2?.playerScore || 0}`,
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
}

// Export singleton instance
export const oneVOneDisconnectHandler = new OneVOneDisconnectHandler(); 