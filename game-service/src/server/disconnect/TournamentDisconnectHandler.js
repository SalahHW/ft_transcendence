/**
 * Tournament specific disconnect handler
 * Handles disconnections for tournament matches with complex bracket logic
 */

import { BaseDisconnectHandler, PlayerStates, DisconnectionReasons, MatchTypes } from './BaseDisconnectHandler.js';
import { gameStateManager } from '../../game/GameStateManager.js';
import { gameEngine } from '../../game/GameEngine.js';
import { LogUtils, TimeUtils } from '../../utils/helpers.js';
import { playerManager } from '../../player/PlayerManager.js';
import { reportMatchResultsToAPI } from '../api.js';
import { tournamentManager } from '../../tournament/TournamentManager.js';
import { GAME_CONFIG } from '../../core/constants.js';

/**
 * Tournament specific disconnect handler
 */
export class TournamentDisconnectHandler extends BaseDisconnectHandler {
  constructor() {
    super();
    this.matchType = MatchTypes.TOURNAMENT;
  }

  /**
   * Handle unexpected disconnection
   */
  handleDisconnection(playerId, roomId, reason) {
    console.log(`🏆 TOURNAMENT DISCONNECT: Player ${playerId} from room ${roomId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room || !this.shouldHandleDisconnection(room)) {
      console.log(`Room ${roomId} not found or not in valid state for tournament disconnect handling`);
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
        console.warn(`Unknown player state: ${playerState} for tournament player ${playerId}`);
        this.handleWaitingStateDisconnect(playerId, roomId, reason);
    }
  }

  /**
   * Handle explicit leave game button click
   */
  handleExplicitLeave(playerId, roomId) {
    console.log(`🏃 Tournament player ${playerId} explicitly leaving tournament in room ${roomId}`);
    
    // Mark player as leaving
    playerManager.markPlayerLeaving(playerId);
    
    // Handle as disconnection with explicit reason
    this.handleDisconnection(playerId, roomId, DisconnectionReasons.PLAYER_LEFT);
  }

  /**
   * Handle disconnection during waiting state
   */
  handleWaitingStateDisconnect(playerId, roomId, reason) {
    console.log(`⏳ Handling tournament waiting state disconnect for player ${playerId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.error(`Room ${roomId} not found for tournament waiting state disconnect`);
      return;
    }
    
    // Check if this is a tournament waiting room
    if (room.metadata?.roomType === 'waiting' && room.matchType === 'tournament') {
      console.log(`🏆 Tournament waiting room disconnect detected for player ${playerId}`);
      
      // Delegate to tournament manager for waiting room disconnections
      tournamentManager.handlePlayerDisconnect(playerId, roomId);
      
      // Notify remaining players about the disconnect
      this.notifyWaitingRoomDisconnect(roomId, playerId, room.players.length);
    } else {
      // Handle as regular tournament room disconnect
      console.log(`🏆 Regular tournament room disconnect for player ${playerId}`);
      tournamentManager.handlePlayerDisconnect(playerId, roomId);
    }
  }

  /**
   * Handle disconnection from tournament waiting room (no WebSocket connection yet)
   */
  handleWaitingRoomDisconnect(playerId, roomId, reason) {
    console.log(`🏆 Handling tournament waiting room disconnect for player ${playerId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room || room.metadata?.roomType !== 'waiting' || room.matchType !== 'tournament') {
      console.error(`Invalid tournament waiting room for disconnect: ${roomId}`);
      return;
    }
    
    // Delegate to tournament manager
    tournamentManager.handlePlayerDisconnect(playerId, roomId);
    
    // Notify remaining players
    this.notifyWaitingRoomDisconnect(roomId, playerId, room.players.length);
  }

  /**
   * Notify remaining players in waiting room about a disconnect
   */
  notifyWaitingRoomDisconnect(roomId, disconnectedPlayerId, remainingPlayerCount) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) return;
    
    // Get the disconnected player's username for the notification
    const disconnectedPlayer = room.players.find(p => p.id === disconnectedPlayerId);
    const playerUsername = disconnectedPlayer?.username || disconnectedPlayerId;
    
    console.log(`🏆 Notifying waiting room ${roomId} about disconnect: ${playerUsername} left (${remainingPlayerCount} players remaining)`);
    
    // Send notification to remaining players (if they have WebSocket connections)
    const connectedPlayers = room.players.filter(p => p.id !== disconnectedPlayerId && p.ws && p.ws.readyState === 1);
    
    connectedPlayers.forEach(player => {
      try {
        player.ws.send(JSON.stringify({
          type: 'tournamentPlayerLeft',
          roomId,
          disconnectedPlayer: {
            id: disconnectedPlayerId,
            username: playerUsername
          },
          remainingPlayers: remainingPlayerCount,
          maxPlayers: 4
        }));
      } catch (error) {
        console.error(`Failed to notify player ${player.id} about tournament disconnect:`, error);
      }
    });
  }

  /**
   * Handle disconnection during pre-game states (loading, announcement, launch animation)
   */
  handlePreGameDisconnect(playerId, roomId, reason) {
    console.log(`🎬 Handling tournament pre-game disconnect for player ${playerId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`Could not find players in room ${roomId} for tournament pre-game disconnect handling`);
      return;
    }

    // Award forfeit win
    this.awardForfeitWin(room, roomId, remainingPlayer, disconnectedPlayer, reason, 'pre_game');
  }

  /**
   * Handle disconnection during active gameplay
   */
  handleInGameDisconnect(playerId, roomId, reason) {
    console.log(`🎮 Handling tournament in-game disconnect for player ${playerId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`Could not find players in room ${roomId} for tournament in-game disconnect handling`);
      return;
    }

    // Award forfeit win
    this.awardForfeitWin(room, roomId, remainingPlayer, disconnectedPlayer, reason, 'in_game');
  }

  /**
   * Handle disconnection after game is over
   */
  handlePostGameDisconnect(playerId, roomId) {
    console.log(`🏁 Handling tournament post-game disconnect for player ${playerId}`);
    
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
    console.log(`🏆 Awarding tournament forfeit win to ${winner.id} (${winner.username || 'Anonymous'})`);
    
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
        context: context,
        tournamentPhase: room.metadata?.tournamentPhase || 'unknown',
        roomType: room.metadata?.roomType || 'unknown'
      },
      matchType: 'tournament_forfeit',
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
        return `Tournament player left ${contextText}`;
      case DisconnectionReasons.BROWSER_REFRESH:
        return `Tournament player refreshed browser ${contextText}`;
      case DisconnectionReasons.BROWSER_NAVIGATION:
        return `Tournament player navigated away ${contextText}`;
      case DisconnectionReasons.BROWSER_CLOSE:
        return `Tournament player closed browser ${contextText}`;
      case DisconnectionReasons.NETWORK_DISCONNECT:
        return `Tournament player lost connection ${contextText}`;
      case DisconnectionReasons.TIMEOUT:
        return `Tournament player timed out ${contextText}`;
      default:
        return `Tournament player disconnected ${contextText}`;
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
      console.error('❌ Failed to report tournament forfeit results:', error);
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
   * Setup WebSocket disconnect handlers for a connection
   */
  setupWebSocketHandlers(ws, playerId, roomId) {
    if (!ws) return;

    ws.on('close', (code, reason) => {
      const disconnectReason = this.getDisconnectionReasonFromCloseCode(code);
      this.handleDisconnection(playerId, roomId, disconnectReason);
    });

    ws.on('error', (error) => {
      console.error(`🔥 Tournament WebSocket error for player ${playerId}:`, error);
      this.handleDisconnection(playerId, roomId, DisconnectionReasons.NETWORK_DISCONNECT);
    });

    // Start heartbeat monitoring
    this.startHeartbeat(playerId, roomId);
  }

  /**
   * Handle player state update from client
   */
  handlePlayerStateUpdate(playerId, roomId, state) {
    if (Object.values(PlayerStates).includes(state)) {
      this.setPlayerState(playerId, roomId, state);
      this.updatePlayerActivity(playerId);
    } else {
      console.warn(`Invalid tournament player state: ${state} for player ${playerId}`);
    }
  }

  /**
   * Handle browser events for tournament waiting rooms
   */
  handleBrowserEvent(playerId, roomId, eventType) {
    console.log(`🌐 Tournament browser event: ${eventType} for player ${playerId} in room ${roomId}`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`Room ${roomId} not found for tournament browser event handling`);
      return;
    }

    let reason;
    switch (eventType) {
      case 'beforeunload':
      case 'pagehide':
      case 'unload':
      case 'popstate':
      case 'visibility_timeout':
        reason = 'browser_navigation';
        break;
      case 'visibilitychange':
        // Don't treat visibility change as disconnect
        return;
      default:
        reason = 'browser_event';
    }

    // Check if this is a tournament waiting room
    if (room.metadata?.roomType === 'waiting' && room.matchType === 'tournament') {
      console.log(`🏆 Tournament waiting room browser event: ${eventType} for player ${playerId}`);
      this.handleWaitingRoomDisconnect(playerId, roomId, reason);
    } else {
      // Handle as regular tournament disconnect
      this.handleDisconnection(playerId, roomId, reason);
    }
  }
}

// Export singleton instance
export const tournamentDisconnectHandler = new TournamentDisconnectHandler(); 