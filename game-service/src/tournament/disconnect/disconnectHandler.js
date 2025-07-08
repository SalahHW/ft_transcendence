/**
 * Tournament Match Disconnect Handler
 * Handles disconnections for tournament matches (semi-finals, finals) with state-based forfeit logic
 * Based on OneVOne handler but adapted for tournament-specific scenarios
 */

import { BaseDisconnectHandler, PlayerStates, DisconnectionReasons, MatchTypes } from '../../server/disconnect/BaseDisconnectHandler.js';
import { gameStateManager } from '../../game/GameStateManager.js';
import { gameEngine } from '../../game/GameEngine.js';
import { LogUtils, TimeUtils } from '../../utils/helpers.js';
import { playerManager } from '../../player/PlayerManager.js';
import { reportMatchResultsToAPI } from '../../server/api.js';
import { GAME_CONFIG } from '../../core/constants.js';
import { TournamentRoomTypes, TournamentPhases } from '../constants.js';
import { tournamentManager } from '../TournamentManager.js';

/**
 * Tournament Match Disconnect Handler
 */
export class TournamentMatchDisconnectHandler extends BaseDisconnectHandler {
  constructor() {
    super();
    this.matchType = MatchTypes.TOURNAMENT;
  }

  /**
   * Handle unexpected disconnection in tournament matches
   */
  async handleDisconnection(playerId, roomId, reason) {
    console.log(`🏆 TOURNAMENT MATCH DISCONNECT: Player ${playerId} from room ${roomId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.log(`🏆 Room ${roomId} not found for tournament match disconnect handling`);
      this.removePlayerFromGame(playerId);
      return;
    }

    // Verify this is a tournament match room (not waiting room)
    if (!this.isTournamentMatchRoom(room)) {
      console.log(`🏆 Room ${roomId} is not a tournament match room, skipping tournament match handler`);
      return;
    }

    // Clean up player connection first
    this.cleanupPlayerConnection(playerId);
    
    // Get current player state
    const playerState = this.getPlayerState(playerId, roomId);
    
    console.log(`🏆 Tournament match disconnect - Player ${playerId} in state: ${playerState}, room type: ${room.metadata?.roomType}`);
    
    // Handle based on current state
    switch (playerState) {
      case PlayerStates.WAITING:
        this.handleWaitingStateDisconnect(playerId, roomId, reason);
        break;
      case PlayerStates.LOADING:
      case PlayerStates.ANNOUNCEMENT:
      case PlayerStates.LAUNCH_ANIMATION:
        await this.handlePreGameDisconnect(playerId, roomId, reason);
        break;
      case PlayerStates.PLAYING:
        await this.handleInGameDisconnect(playerId, roomId, reason);
        break;
      case PlayerStates.GAME_OVER:
        this.handlePostGameDisconnect(playerId, roomId);
        break;
      default:
        console.warn(`🏆 Unknown tournament player state: ${playerState} for player ${playerId}`);
        this.handleWaitingStateDisconnect(playerId, roomId, reason);
    }
  }

  /**
   * Handle explicit leave game button click in tournament matches
   */
  handleExplicitLeave(playerId, roomId) {
    console.log(`🏃 Tournament match player ${playerId} explicitly leaving tournament match in room ${roomId}`);
    
    // Mark player as leaving
    const player = gameStateManager.getPlayer(playerId);
    if (player) {
      player.isLeaving = true;
    }
    
    // Handle as disconnection with explicit reason
    this.handleDisconnection(playerId, roomId, DisconnectionReasons.PLAYER_LEFT);
  }

  /**
   * Handle disconnection during waiting state in tournament matches
   */
  handleWaitingStateDisconnect(playerId, roomId, reason) {
    console.log(`🏆 Tournament match waiting state disconnect: Player ${playerId} in room ${roomId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) return;

    // DEBUG: Log room state to understand what's happening
    console.log(`🏆 DEBUG: Room ${roomId} state - gameStarted: ${room.gameStarted}, ready: ${room.ready}, players: ${room.players.length}`);
    console.log(`🏆 DEBUG: Room ${roomId} metadata:`, room.metadata);

    // Check if game has started but is in animation phase
    if (room.gameStarted && room.ready) {
      console.log(`🏆 Tournament match game started but in animation phase, handling as pre-game disconnect`);
      this.handlePreGameDisconnect(playerId, roomId, reason);
      return;
    }

    // Check if this is a tournament match room with both players assigned
    // Even if the game hasn't started yet, if both players were assigned to the match,
    // a disconnect should result in a forfeit win for the remaining player
    if (room.metadata?.roomType && 
        (room.metadata.roomType.includes('semi_final') || 
         room.metadata.roomType.includes('final'))) {
      
      const remainingPlayer = room.players.find(p => p.id !== playerId);
      const disconnectedPlayer = room.players.find(p => p.id === playerId);
      
      if (remainingPlayer && disconnectedPlayer) {
        console.log(`🏆 Tournament match waiting state forfeit: ${remainingPlayer.username} wins, ${disconnectedPlayer.username} disconnected before game start`);
        this.handlePreGameDisconnect(playerId, roomId, reason);
        return;
      }
    }

    // Remove player from room
    room.players = room.players.filter(p => p.id !== playerId);
    
    console.log(`🏆 Tournament match waiting state: Player ${playerId} removed from room ${roomId} (${room.players.length}/2 remaining)`);
    
    // Handle empty rooms
    if (room.players.length === 0) {
      console.log(`🏆 Tournament match room ${roomId} is empty, removing room`);
      gameStateManager.removeRoom(roomId);
    } else {
      // Notify remaining player
      this.notifyPlayerDisconnected(roomId, playerId, room.players.length);
    }
  }

  /**
   * Handle disconnection during pre-game states in tournament matches
   */
  async handlePreGameDisconnect(playerId, roomId, reason) {
    console.log(`🏆 Tournament match pre-game disconnect: Player ${playerId} in room ${roomId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`🏆 Could not find players in tournament room ${roomId} for pre-game disconnect handling`);
      return;
    }

    console.log(`🏆 Tournament match pre-game forfeit: ${remainingPlayer.username} wins, ${disconnectedPlayer.username} disconnected`);

    // ⭐ CRITICAL FIX: Immediately dispose ball to prevent it from moving during finals
    await this.immediatelyDisposeBall(room, roomId);

    // Award forfeit win and handle tournament advancement
    await this.awardTournamentForfeitWin(room, roomId, remainingPlayer, disconnectedPlayer, reason, 'pre_game');
  }

  /**
   * Handle disconnection during active gameplay in tournament matches
   */
  async handleInGameDisconnect(playerId, roomId, reason) {
    console.log(`🏆 Tournament match in-game disconnect: Player ${playerId} in room ${roomId} (${reason})`);
    
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`🏆 Could not find players in tournament room ${roomId} for in-game disconnect handling`);
      return;
    }

    console.log(`🏆 Tournament match in-game forfeit: ${remainingPlayer.username} wins, ${disconnectedPlayer.username} disconnected`);

    // ⭐ CRITICAL FIX: Immediately dispose ball to prevent it from moving during finals
    await this.immediatelyDisposeBall(room, roomId);

    // Award forfeit win and handle tournament advancement
    await this.awardTournamentForfeitWin(room, roomId, remainingPlayer, disconnectedPlayer, reason, 'in_game');
  }

  /**
   * Handle disconnection after game is over in tournament matches
   */
  handlePostGameDisconnect(playerId, roomId) {
    console.log(`🏆 Tournament match post-game disconnect: Player ${playerId} in room ${roomId}`);
    
    // Just clean up, no special handling needed
    this.removePlayerFromGame(playerId);
    
    const room = gameStateManager.getRoom(roomId);
    if (room && room.players.length === 0) {
      console.log(`🏆 Tournament match room ${roomId} is empty after post-game disconnect, removing room`);
      gameStateManager.removeRoom(roomId);
    }
  }

  /**
   * Award forfeit win to remaining player in tournament matches
   */
  async awardTournamentForfeitWin(room, roomId, winner, loser, reason, context) {
    console.log(`🏆 Awarding tournament forfeit win: ${winner.username} defeats ${loser.username} in ${room.metadata?.roomType}`);
    
    // Mark game as over immediately
    room.isGameOver = true;

    // Update disconnection tracking in waiting room data
    const waitingRoomId = room.metadata?.waitingRoomId;
    if (waitingRoomId) {
      await this.updateTournamentDisconnectionStatus(waitingRoomId, loser.id, true);
    }
    
    // Create tournament match data
    const matchData = this.createTournamentForfeitMatchData(room, roomId, winner, loser, reason, context);
    
    // Log the tournament forfeit
    LogUtils.logMatchCompletion(matchData);
    
    // Report results to external APIs
    this.reportTournamentForfeitResults(matchData);
    
    // Handle tournament advancement
    this.handleTournamentAdvancement(room, roomId, matchData);
    
    // Notify remaining player
    this.notifyTournamentForfeitWin(roomId, matchData);
    
    // Schedule cleanup
    this.scheduleTournamentRoomCleanup(roomId, 5000);
  }

  /**
   * Create match data for tournament forfeit scenarios
   */
  createTournamentForfeitMatchData(room, roomId, winner, loser, reason, context) {
    const matchEndTime = TimeUtils.getCurrentTimestamp();
    const matchStartTime = room.startTime || matchEndTime;
    
    return {
      roomId,
      matchType: this.matchType,
      tournamentPhase: room.metadata?.tournamentPhase,
      tournamentRoomType: room.metadata?.roomType,
      waitingRoomId: room.metadata?.waitingRoomId,
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
        forfeitReason: this.getTournamentForfeitReasonText(reason, context, room.metadata?.roomType),
        disconnectionType: reason,
        context: context,
        tournamentPhase: room.metadata?.tournamentPhase
      },
      matchType: 'tournament_forfeit',
      disconnectionReason: reason,
      serverTime: Date.now()
    };
  }

  /**
   * Get human-readable tournament forfeit reason
   */
  getTournamentForfeitReasonText(reason, context, roomType) {
    const contextText = context === 'pre_game' ? 'before the match started' : 'during the match';
    const roomTypeText = this.getRoomTypeDisplayName(roomType);
    
    switch (reason) {
      case DisconnectionReasons.PLAYER_LEFT:
        return `Player left ${contextText} in ${roomTypeText}`;
      case DisconnectionReasons.BROWSER_REFRESH:
        return `Player refreshed browser ${contextText} in ${roomTypeText}`;
      case DisconnectionReasons.BROWSER_NAVIGATION:
        return `Player navigated away ${contextText} in ${roomTypeText}`;
      case DisconnectionReasons.BROWSER_CLOSE:
        return `Player closed browser ${contextText} in ${roomTypeText}`;
      case DisconnectionReasons.NETWORK_DISCONNECT:
        return `Player lost connection ${contextText} in ${roomTypeText}`;
      case DisconnectionReasons.TIMEOUT:
        return `Player timed out ${contextText} in ${roomTypeText}`;
      default:
        return `Player disconnected ${contextText} in ${roomTypeText}`;
    }
  }

  /**
   * Get display name for tournament room type
   */
  getRoomTypeDisplayName(roomType) {
    switch (roomType) {
      case TournamentRoomTypes.SEMI_FINAL_A:
        return 'Semi-Final A';
      case TournamentRoomTypes.SEMI_FINAL_B:
        return 'Semi-Final B';
      case TournamentRoomTypes.WINNER_FINAL:
        return 'Winner Final';
      case TournamentRoomTypes.LOSER_FINAL:
        return 'Loser Final';
      default:
        return 'Tournament Match';
    }
  }

  /**
   * Handle tournament advancement after forfeit
   */
  async handleTournamentAdvancement(room, roomId, matchData) {
    const waitingRoomId = room.metadata?.waitingRoomId;
    if (!waitingRoomId) {
      console.error(`🏆 No waiting room ID found for tournament advancement in room ${roomId}`);
      return;
    }

    console.log(`🏆 Handling tournament advancement for room ${roomId} in tournament ${waitingRoomId}`);

    try {
      // Import tournament manager dynamically to avoid circular dependencies
      const { tournamentManager } = await import('../TournamentManager.js');
      
      const roomType = room.metadata?.roomType;
      if (roomType === TournamentRoomTypes.SEMI_FINAL_A || roomType === TournamentRoomTypes.SEMI_FINAL_B) {
        console.log(`🏆 Semi-final forfeit detected, advancing winner to finals`);
        await tournamentManager.handleSemiFinalMatchEnd(waitingRoomId, roomId, matchData);
      } else if (roomType === TournamentRoomTypes.WINNER_FINAL || roomType === TournamentRoomTypes.LOSER_FINAL) {
        console.log(`🏆 Final forfeit detected, completing tournament`);
        await tournamentManager.handleFinalMatchEnd(waitingRoomId, roomId, matchData);
      } else {
        console.error(`🏆 Unknown tournament room type for advancement: ${roomType}`);
      }
    } catch (error) {
      console.error(`🏆 Error handling tournament advancement:`, error);
    }
  }

  /**
   * Clean up player connection in tournament matches
   */
  cleanupPlayerConnection(playerId) {
    console.log(`🏆 Cleaning up tournament player connection for ${playerId}`);
    
    const player = gameStateManager.getPlayer(playerId);
    
    if (player && player.ws) {
      this.cleanupWebSocket(player.ws);
    }
    
    this.removePlayerFromGame(playerId);
  }

  /**
   * Update disconnection status in tournament waiting room data
   */
  async updateTournamentDisconnectionStatus(waitingRoomId, playerId, disconnected = true) {
    try {
      // Import tournament manager dynamically to avoid circular dependencies
      const { tournamentManager } = await import('../TournamentManager.js');
      
      const waitingRoomData = tournamentManager.waitingRooms.get(waitingRoomId);
      if (!waitingRoomData) return;

      // Check if player is already in the correct state to prevent duplicate tracking
      const player = waitingRoomData.players.find(p => p.id === playerId);
      if (player && player.connected === !disconnected) {
        console.log(`🏆 Player ${playerId} already has correct disconnection status (${disconnected}), skipping update`);
        return;
      }

      if (player) {
        player.connected = !disconnected;
        player.disconnectedAt = disconnected ? Date.now() : null;
      }

      const playerStatus = waitingRoomData.playerStatus.get(playerId);
      if (playerStatus) {
        playerStatus.connected = !disconnected;
        playerStatus.disconnectedAt = disconnected ? Date.now() : null;
      }

      // Update disconnected players array
      if (disconnected && !waitingRoomData.disconnectedPlayers.includes(playerId)) {
        waitingRoomData.disconnectedPlayers.push(playerId);
      } else if (!disconnected) {
        waitingRoomData.disconnectedPlayers = waitingRoomData.disconnectedPlayers.filter(id => id !== playerId);
      }

      console.log(`🏆 Updated tournament disconnection status for player ${playerId}: disconnected=${disconnected}`);
      console.log(`🏆 Tournament ${waitingRoomId} - Connected: ${waitingRoomData.players.filter(p => p.connected).length}, Disconnected: ${waitingRoomData.disconnectedPlayers.length}`);
    } catch (error) {
      console.error(`🏆 Error updating tournament disconnection status:`, error);
    }
  }

  /**
   * Report tournament forfeit results to external APIs
   */
  async reportTournamentForfeitResults(matchData) {
    try {
      console.log(`🏆 Reporting tournament forfeit results for room ${matchData.roomId}`);
      await reportMatchResultsToAPI(matchData);
    } catch (error) {
      console.error('🏆 Failed to report tournament forfeit results:', error);
    }
  }

  /**
   * Notify remaining player of tournament forfeit win
   */
  notifyTournamentForfeitWin(roomId, matchData) {
    console.log(`🏆 Notifying tournament forfeit win in room ${roomId}`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.error(`🏆 Room ${roomId} not found for forfeit win notification`);
      return;
    }

    const remainingPlayer = room.players.find(p => p.id !== matchData.loser.id);
    if (!remainingPlayer || !remainingPlayer.ws || remainingPlayer.ws.readyState !== 1) {
      console.error(`🏆 Remaining player not found or not connected for forfeit win notification`);
      return;
    }

    // Send tournament advancement message to trigger proper frontend cleanup
    const advancementMessage = {
      type: 'tournamentAdvancement',
      status: 'transferred_to_final',
      finalType: room.metadata?.roomType === 'semi_final_a' || room.metadata?.roomType === 'semi_final_b' ? 'winner' : 'loser',
      message: '🎉 You advanced to the final due to opponent disconnect!',
      matchData: matchData
    };

    try {
      remainingPlayer.ws.send(JSON.stringify(advancementMessage));
      console.log(`🏆 Sent tournament advancement message to ${remainingPlayer.username} for forfeit win`);
    } catch (error) {
      console.error(`🏆 Failed to send tournament advancement message to ${remainingPlayer.username}:`, error);
    }
  }

  /**
   * Notify players of a disconnection in tournament matches (non-game scenario)
   */
  notifyPlayerDisconnected(roomId, disconnectedPlayerId, remainingPlayerCount) {
    console.log(`🏆 Notifying tournament match disconnect: Player ${disconnectedPlayerId} left, ${remainingPlayerCount} remaining`);
    
    gameEngine.broadcastToRoom(roomId, {
      type: 'playerDisconnected',
      playerId: disconnectedPlayerId,
      remainingPlayers: remainingPlayerCount,
      isTournamentMatch: true
    });
  }

  /**
   * Schedule tournament room cleanup with delay
   */
  scheduleTournamentRoomCleanup(roomId, delayMs = 5000) {
    console.log(`🏆 Scheduling tournament room cleanup for ${roomId} in ${delayMs}ms`);
    
    setTimeout(() => {
      const room = gameStateManager.getRoom(roomId);
      if (room) {
        console.log(`🏆 Cleaning up tournament room ${roomId}`);
        gameStateManager.removeRoom(roomId);
      }
    }, delayMs);
  }

  /**
   * Handle player state update from client in tournament matches
   */
  handlePlayerStateUpdate(playerId, roomId, state) {
    if (Object.values(PlayerStates).includes(state)) {
      this.setPlayerState(playerId, roomId, state);
      this.updatePlayerActivity(playerId);
      console.log(`🏆 Tournament player state update: ${playerId} -> ${state} in room ${roomId}`);
    } else {
      console.warn(`🏆 Invalid tournament player state: ${state} for player ${playerId}`);
    }
  }

  /**
   * Handle browser events for tournament matches
   */
  handleBrowserEvent(playerId, roomId, eventType) {
    console.log(`🌐 Tournament match browser event: ${eventType} for player ${playerId} in room ${roomId}`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`🏆 Room ${roomId} not found for tournament match browser event handling`);
      return;
    }

    // Verify this is a tournament match room
    if (!this.isTournamentMatchRoom(room)) {
      console.log(`🏆 Room ${roomId} is not a tournament match room, skipping browser event handling`);
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

    console.log(`🏆 Tournament match browser event: ${eventType} for player ${playerId} -> ${reason}`);
    this.handleDisconnection(playerId, roomId, reason);
  }

  /**
   * Check if room is a tournament match room (not waiting room)
   */
  isTournamentMatchRoom(room) {
    if (!room || room.matchType !== 'tournament') {
      return false;
    }

    const roomType = room.metadata?.roomType;
    return roomType === TournamentRoomTypes.SEMI_FINAL_A ||
           roomType === TournamentRoomTypes.SEMI_FINAL_B ||
           roomType === TournamentRoomTypes.WINNER_FINAL ||
           roomType === TournamentRoomTypes.LOSER_FINAL;
  }

  /**
   * Get tournament match statistics
   */
  getTournamentMatchStats() {
    return {
      activeTournamentMatches: this.getActiveTournamentMatchCount(),
      connectionStats: this.getConnectionStats(),
      handlerType: 'tournament_match'
    };
  }

  /**
   * Get count of active tournament matches
   */
  getActiveTournamentMatchCount() {
    let count = 0;
    const rooms = gameStateManager.getAllRooms();
    
    for (const room of rooms) {
      if (this.isTournamentMatchRoom(room)) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * ⭐ CRITICAL FIX: Immediately dispose ball to prevent movement during finals
   */
  async immediatelyDisposeBall(room, roomId) {
    console.log(`🏆 Immediately disposing ball for room ${roomId} due to disconnect`);
    
    if (room.ball) {
      // Stop ball movement by setting velocity to zero
      if (room.ball.velocity) {
        room.ball.velocity.set(0, 0, 0);
        console.log(`🏆 Ball velocity set to zero for room ${roomId}`);
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
      
      // ⭐ CRITICAL: Nullify the ball object to stop all movement immediately
      room.ball = null;
      
      console.log(`🏆 Ball object immediately nullified for room ${roomId}`);
    }
    
    // ⭐ CRITICAL FIX: Set flag to prevent ball recreation
    room.ballDisposed = true;
    console.log(`🏆 Ball disposal flag set for room ${roomId}`);
    
    // ⭐ CRITICAL FIX: Send final sync message with ballState: null to explicitly stop client processing
    try {
      // Import gameEngine dynamically to avoid circular dependencies
      const { gameEngine } = await import('../../game/GameEngine.js');
      gameEngine.broadcastToRoom(roomId, {
        type: 'sync',
        playerPositions: {},
        ballState: null,
        serverTime: Date.now(),
        roomId: roomId,
        isDelta: true,
        ballDisposed: true // ⭐ NEW: Flag to indicate ball has been disposed
      });
      console.log(`🏆 Sent final sync message with ballState: null for room ${roomId}`);
    } catch (error) {
      console.error(`🏆 Error sending final sync message for room ${roomId}:`, error);
    }
    
    // Clear ball update flags
    room.ballUpdateSent = false;
    if (room.ballUpdateTimeout) {
      clearTimeout(room.ballUpdateTimeout);
      room.ballUpdateTimeout = null;
      console.log(`🏆 Ball update timeout cleared for room ${roomId}`);
    }
    
    console.log(`🏆 Immediate ball disposal completed for room ${roomId}`);
  }
}

// Export singleton instance
export const tournamentMatchDisconnectHandler = new TournamentMatchDisconnectHandler(); 