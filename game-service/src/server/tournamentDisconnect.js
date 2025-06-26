import { disconnectionHandler } from './1v1Disconnect.js';
import { gameStateManager } from '../game/GameStateManager.js';
import { gameEngine } from '../game/GameEngine.js';
import { reportMatchResultsToAPI } from './api.js';
import { LogUtils, TimeUtils } from '../utils/helpers.js';
import { playerManager } from '../player/PlayerManager.js';
import { tournamentManager } from '../room/tournamentManager.js';

/**
 * Tournament-specific disconnection handling for maintaining bracket integrity
 * Extends the base disconnection handler with tournament-specific logic
 */
export class TournamentDisconnectionHandler {
  constructor() {
    this.baseDisconnectHandler = disconnectionHandler;
    this.tournamentDisconnectionReasons = {
      SEMI_FINAL_DISCONNECT: 'semi_final_disconnect',
      FINAL_DISCONNECT: 'final_disconnect',
      WAITING_ROOM_DISCONNECT: 'waiting_room_disconnect'
    };
  }

  /**
   * Main entry point for tournament disconnection handling
   */
  handleTournamentPlayerDisconnect(playerId, roomId) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.log(`Room ${roomId} not found during tournament disconnect`);
      return;
    }

    // Check if this is a tournament room
    if (!this.isTournamentRoom(room)) {
      // Not a tournament room, delegate to base handler
      return this.baseDisconnectHandler.handlePlayerDisconnect(playerId, roomId);
    }

    const player = gameStateManager.getPlayer(playerId);
    const isExplicitLeave = player?.isLeaving === true;
    
    console.log(`🏆🔥 TOURNAMENT DISCONNECT: Player ${playerId} from tournament room ${roomId} ${isExplicitLeave ? '(EXPLICIT LEAVE)' : '(UNEXPECTED DISCONNECT)'}`);
    
    // Determine tournament room type and handle accordingly
    const roomType = this.getTournamentRoomType(room);
    
    switch (roomType) {
      case 'waiting':
        return this.handleWaitingRoomDisconnect(playerId, roomId, isExplicitLeave);
      case 'semifinal':
        return this.handleSemiFinalDisconnect(playerId, roomId, isExplicitLeave);
      case 'final':
        return this.handleFinalDisconnect(playerId, roomId, isExplicitLeave);
      default:
        console.warn(`Unknown tournament room type: ${roomType}, using base handler`);
        return this.baseDisconnectHandler.handlePlayerDisconnect(playerId, roomId);
    }
  }

  /**
   * Handle disconnection in tournament waiting room (before semi-finals start)
   */
  handleWaitingRoomDisconnect(playerId, roomId, isExplicitLeave) {
    console.log(`🏆 Handling waiting room disconnect for player ${playerId}`);
    
    // In waiting room, just remove the player - no forfeit needed
    const room = gameStateManager.getRoom(roomId);
    if (!room) return;

    // Clean up the player connection
    this.baseDisconnectHandler.cleanupPlayerConnection(playerId);
    
    // Remove player from room
    room.players = room.players.filter(p => p.id !== playerId);
    
    // Notify remaining players
    if (room.players.length > 0) {
      gameEngine.broadcastToRoom(roomId, {
        type: 'playerDisconnected',
        playerId,
        remainingPlayers: room.players.length,
        message: `Player left the tournament waiting room. ${room.players.length}/4 players remaining.`
      });
    }

    // If room becomes empty, clean it up
    if (room.players.length === 0) {
      gameStateManager.removeRoom(roomId);
      console.log(`🏆 Removed empty tournament waiting room ${roomId}`);
    }

    console.log(`🏆 Waiting room disconnect handled: ${room.players.length}/4 players remaining`);
  }

  /**
   * Handle disconnection during semi-final match
   * NEW LOGIC: Disconnected player = 4th place, remaining player wins and waits
   * When other semi completes, its loser gets 3rd place and is disconnected
   */
  handleSemiFinalDisconnect(playerId, roomId, isExplicitLeave) {
    console.log(`🏆 Handling semi-final disconnect for player ${playerId} in room ${roomId}`);
    
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`🏆 Could not find players in semi-final room ${roomId} for disconnect handling`);
      return;
    }

    // Check if game is in progress
    if (!this.baseDisconnectHandler.isGameInProgress(room)) {
      // Game not in progress, handle as regular disconnect
      return this.baseDisconnectHandler.handleRegularDisconnect(playerId, roomId);
    }

    const disconnectionReason = isExplicitLeave ? 
      this.tournamentDisconnectionReasons.SEMI_FINAL_DISCONNECT : 
      this.tournamentDisconnectionReasons.SEMI_FINAL_DISCONNECT;
    
    const actionText = isExplicitLeave ? 'left the semi-final' : 'disconnected during semi-final';
    console.log(`🏆 Semi-final: Player ${playerId} ${actionText}. Awarding win to ${remainingPlayer.id}`);
    
    // Mark game as over immediately
    room.isGameOver = true;
    
    // NEW LOGIC: Mark tournament as having a disconnect forfeit
    const tournamentId = room.metadata.tournamentId;
    const otherSemiRoomId = this._getOtherSemiFinalRoom(roomId, tournamentId);
    
    // Set tournament metadata to track the forfeit
    if (otherSemiRoomId) {
      const otherSemiRoom = gameStateManager.getRoom(otherSemiRoomId);
      if (otherSemiRoom) {
        otherSemiRoom.metadata.otherSemiHadForfeit = true;
        otherSemiRoom.metadata.forfeitedPlayerId = disconnectedPlayer.id;
        otherSemiRoom.metadata.forfeitWinnerId = remainingPlayer.id;
        console.log(`🏆 Marked other semi-final room ${otherSemiRoomId} - forfeit in ${roomId}`);
      }
    }
    
    // Create tournament-specific forfeit match data
    const matchData = this.createTournamentForfeitMatchData(
      room, 
      roomId, 
      remainingPlayer, 
      disconnectedPlayer, 
      actionText,
      disconnectionReason,
      'semifinal'
    );

    // Add tournament placement information
    matchData.tournamentPlacements = {
      fourthPlace: {
        id: disconnectedPlayer.id,
        username: disconnectedPlayer.username,
        reason: 'disconnected_in_semifinal'
      },
      remainingWinner: {
        id: remainingPlayer.id,
        username: remainingPlayer.username,
        status: 'advancing_to_final'
      }
    };

    // Log the tournament forfeit
    LogUtils.logMatchCompletion(matchData);
    
    // Report results to external APIs
    this.reportTournamentForfeitResults(matchData);
    
    // NEW: Send semi-final forfeit win notification to remaining player
    this.notifyTournamentForfeitWinner(roomId, remainingPlayer, matchData);
    
    // NEW: Disconnect the forfeiting player (4th place)
    this.baseDisconnectHandler.cleanupPlayerConnection(disconnectedPlayer.id);
    console.log(`🏆 Disconnected 4th place player: ${disconnectedPlayer.username}`);
    
    // NEW: Progress tournament with forfeit logic
    this.progressTournamentAfterSemiFinalForfeit(room, matchData, disconnectedPlayer, remainingPlayer);
    
    // Schedule room cleanup
    this.baseDisconnectHandler.scheduleRoomCleanup(roomId, 5000);
  }

  /**
   * Handle disconnection during final match
   */
  handleFinalDisconnect(playerId, roomId, isExplicitLeave) {
    console.log(`🏆 Handling final disconnect for player ${playerId} in room ${roomId}`);
    
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`🏆 Could not find players in final room ${roomId} for disconnect handling`);
      return;
    }

    // Check if game is in progress
    if (!this.baseDisconnectHandler.isGameInProgress(room)) {
      // Game not in progress, handle as regular disconnect
      return this.baseDisconnectHandler.handleRegularDisconnect(playerId, roomId);
    }

    const disconnectionReason = isExplicitLeave ? 
      this.tournamentDisconnectionReasons.FINAL_DISCONNECT : 
      this.tournamentDisconnectionReasons.FINAL_DISCONNECT;
    
    const actionText = isExplicitLeave ? 'left the final' : 'disconnected during final';
    const finalType = room.metadata?.finalMatch || 'unknown';
    console.log(`🏆 Final (${finalType}): Player ${playerId} ${actionText}. Awarding win to ${remainingPlayer.id}`);
    
    // Mark game as over immediately
    room.isGameOver = true;
    
    // Create tournament-specific forfeit match data
    const matchData = this.createTournamentForfeitMatchData(
      room, 
      roomId, 
      remainingPlayer, 
      disconnectedPlayer, 
      actionText,
      disconnectionReason,
      'final'
    );

    // Log the tournament forfeit
    LogUtils.logMatchCompletion(matchData);
    
    // Report results to external APIs
    this.reportTournamentForfeitResults(matchData);
    
    // Notify remaining player of final victory
    this.notifyTournamentRemainingPlayer(roomId, matchData, 'final');
    
    // Handle final completion through tournament manager
    try {
      tournamentManager.handleFinalCompletion(roomId, matchData);
    } catch (error) {
      console.error(`🏆 Error handling final completion after forfeit for room ${roomId}:`, error);
    }
    
    // Schedule room cleanup
    this.baseDisconnectHandler.scheduleRoomCleanup(roomId, 5000);
  }

  /**
   * Progress tournament bracket after semi-final forfeit
   * This ensures the disconnected player is still placed in the appropriate final match
   */
  progressTournamentAfterSemiFinalForfeit(semiFinalRoom, matchData, disconnectedPlayer, remainingPlayer) {
    console.log(`🏆 Processing tournament progression after semi-final forfeit...`);
    
    try {
      // NEW LOGIC: Don't use normal semi-final completion, use special forfeit handling
      // The remaining player should be put in waiting state until other semi completes
      tournamentManager.handleSemiFinalForfeit(semiFinalRoom.id, matchData, remainingPlayer);
      
      console.log(`🏆 Tournament progression completed after semi-final forfeit`);
      console.log(`🏆 Winner ${matchData.winner.username} waiting for final opponent`);
      console.log(`🏆 Disconnected player ${disconnectedPlayer.username} eliminated (4th place)`);
      
    } catch (error) {
      console.error(`🏆 Error processing tournament progression after forfeit:`, error);
    }
  }

  /**
   * Get the other semi-final room ID for a given semi-final room
   */
  _getOtherSemiFinalRoom(currentSemiRoomId, tournamentId) {
    // Semi-final rooms are named like: {tournamentId}_sf_A and {tournamentId}_sf_B
    const baseId = `${tournamentId}_sf`;
    
    if (currentSemiRoomId === `${baseId}_A`) {
      return `${baseId}_B`;
    } else if (currentSemiRoomId === `${baseId}_B`) {
      return `${baseId}_A`;
    }
    
    console.error(`🏆 Could not determine other semi-final room for ${currentSemiRoomId}`);
    return null;
  }

  /**
   * Notify remaining player of forfeit victory and waiting state
   */
  notifyTournamentForfeitWinner(roomId, remainingPlayer, matchData) {
    if (!remainingPlayer.ws || remainingPlayer.ws.readyState !== 1) {
      console.error(`🏆 Cannot notify forfeit winner ${remainingPlayer.id} - no valid WebSocket`);
      return;
    }

    try {
      // Send game end with forfeit victory
      const gameEndMessage = {
        type: 'gameEnd',
        ...matchData,
        reason: 'opponent_disconnect',
        tournamentAdvancement: {
          stage: 'semifinal',
          result: 'victory_by_forfeit',
          message: 'Opponent disconnected. You advance to the final!',
          placement: 'advancing_to_final'
        }
      };
      
      remainingPlayer.ws.send(JSON.stringify(gameEndMessage));
      console.log(`🏆 Sent forfeit victory notification to ${remainingPlayer.username}`);
      
      // Send waiting state message
      setTimeout(() => {
        if (remainingPlayer.ws && remainingPlayer.ws.readyState === 1) {
          const waitingMessage = {
            type: 'waitingForPlayers',
            readyCount: 1,
            totalNeeded: 2,
            currentPlayerName: remainingPlayer.username || 'You',
            opponentName: 'Waiting for opponent...',
            playerId: remainingPlayer.id,
            isTournament: true,
            tournamentAdvancement: {
              status: 'waiting_for_final_after_forfeit',
              message: 'Waiting for the other semi-final to complete...',
              placement: 'advancing_to_final'
            }
          };
          
          remainingPlayer.ws.send(JSON.stringify(waitingMessage));
          console.log(`🏆 Sent waiting state to forfeit winner ${remainingPlayer.username}`);
        }
      }, 1000); // Small delay to ensure game end is processed first
      
    } catch (error) {
      console.error(`🏆 Error notifying forfeit winner ${remainingPlayer.username}:`, error);
    }
  }

  /**
   * Create tournament-specific forfeit match data
   */
  createTournamentForfeitMatchData(room, roomId, winner, loser, reason, disconnectionReason, tournamentStage) {
    const matchEndTime = TimeUtils.getCurrentTimestamp();
    const matchStartTime = room.startTime || matchEndTime;
    
    return {
      roomId,
      matchStartTime,
      matchEndTime,
      matchDuration: TimeUtils.calculateMatchDuration(matchStartTime, matchEndTime),
      winner: {
        id: winner.id,
        username: winner.username || 'Anonymous',
        score: 11 // Award full score for forfeit win
      },
      loser: {
        id: loser.id,
        username: loser.username || 'Anonymous',
        score: room.ball?.player2?.playerScore || 0
      },
      gameStats: {
        totalRebounds: room.ball?.rebounds || 0,
        finalScore: `11-${room.ball?.player2?.playerScore || 0}`,
        ballSpeed: room.ball?.speed || 0,
        lastHitBy: room.ball?.wasHitByPlayer || null,
        forfeitReason: reason,
        disconnectionType: disconnectionReason,
        tournamentStage: tournamentStage,
        matchType: tournamentStage,
        finalMatchType: room.metadata?.finalMatch // For finals
      },
      matchType: tournamentStage === 'final' ? 'final' : 'semi-final',
      finalMatchType: room.metadata?.finalMatch, // For finals ('winners' or 'losers')
      serverTime: Date.now(),
      disconnectionReason,
      tournamentStage,
      isTournamentForfeit: true
    };
  }

  /**
   * Notify remaining player in tournament match
   */
  notifyTournamentRemainingPlayer(roomId, matchData, tournamentStage) {
    const message = {
      type: 'gameEnd',
      ...matchData,
      reason: 'opponent_disconnect',
      tournamentAdvancement: {
        stage: tournamentStage,
        result: 'victory_by_forfeit',
        message: tournamentStage === 'semifinal' 
          ? 'Opponent disconnected. You advance to the final!'
          : 'Opponent disconnected. You win the tournament!'
      }
    };

    gameEngine.broadcastToRoom(roomId, message);
    
    console.log(`🏆 Notified remaining player in ${tournamentStage} room ${roomId} of forfeit victory`);
  }

  /**
   * Report tournament forfeit results
   */
  async reportTournamentForfeitResults(matchData) {
    try {
      await reportMatchResultsToAPI(matchData);
      console.log(`🏆 Tournament forfeit results reported for room ${matchData.roomId}`);
    } catch (err) {
      console.error('🏆 Failed to report tournament forfeit results:', err.message);
    }
  }

  /**
   * Check if room is a tournament room
   */
  isTournamentRoom(room) {
    return room.metadata?.isTournament === true;
  }

  /**
   * Get tournament room type
   */
  getTournamentRoomType(room) {
    if (!this.isTournamentRoom(room)) {
      return 'regular';
    }
    
    const tournamentType = room.metadata?.tournamentType;
    
    switch (tournamentType) {
      case 'elimination':
        return 'waiting';
      case 'semifinal':
        return 'semifinal';
      case 'final':
        return 'final';
      default:
        return 'unknown';
    }
  }

  /**
   * Handle explicit leave game message for tournaments
   */
  handleTournamentLeaveGameMessage(playerId, roomId) {
    console.log(`🏆 Player ${playerId} is explicitly leaving tournament game in room ${roomId}`);
    
    // Mark player as leaving to distinguish from unexpected disconnect
    playerManager.markPlayerLeaving(playerId);
    
    // Handle the tournament disconnection
    this.handleTournamentPlayerDisconnect(playerId, roomId);
  }

  /**
   * Get tournament disconnection statistics
   */
  getTournamentDisconnectionStats() {
    const baseStats = this.baseDisconnectHandler.getDisconnectionStats();
    
    // Count tournament rooms
    const allRooms = gameStateManager.getGameRooms();
    let tournamentRooms = 0;
    let semiFinalRooms = 0;
    let finalRooms = 0;
    
    for (const room of allRooms.values()) {
      if (this.isTournamentRoom(room)) {
        tournamentRooms++;
        const roomType = this.getTournamentRoomType(room);
        if (roomType === 'semifinal') semiFinalRooms++;
        if (roomType === 'final') finalRooms++;
      }
    }
    
    return {
      ...baseStats,
      tournamentRooms,
      semiFinalRooms,
      finalRooms
    };
  }
}

// Export singleton instance
export const tournamentDisconnectionHandler = new TournamentDisconnectionHandler();

// Export utility functions for backward compatibility
export function handleTournamentPlayerDisconnect(playerId, roomId) {
  return tournamentDisconnectionHandler.handleTournamentPlayerDisconnect(playerId, roomId);
}

export function handleTournamentLeaveGameMessage(playerId, roomId) {
  return tournamentDisconnectionHandler.handleTournamentLeaveGameMessage(playerId, roomId);
}