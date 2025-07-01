import { gameStateManager } from '../game/GameStateManager.js';
import { gameEngine } from '../game/GameEngine.js';
import { LogUtils } from '../utils/helpers.js';
import { playerManager } from '../player/PlayerManager.js';
import { tournamentManager } from '../room/tournamentManager.js';
import { BaseDisconnectHandler, BaseDisconnectUtils, DisconnectReasons } from './disconnectHandler.js';

/**
 * Tournament-specific disconnection handling for maintaining bracket integrity
 * Extends the base disconnection handler with tournament-specific logic
 */
export class TournamentDisconnectionHandler extends BaseDisconnectHandler {
  constructor() {
    super();
    this.tournamentDisconnectionReasons = {
      ...DisconnectReasons,  // Include base reasons
      SEMI_FINAL_DISCONNECT: 'semi_final_disconnect',
      FINAL_DISCONNECT: 'final_disconnect',
      WAITING_ROOM_DISCONNECT: 'waiting_room_disconnect',
      PLAYER_LEFT: 'player_left'
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
        console.warn(`Unknown tournament room type: ${roomType}`);
        return;
    }
  }

  /**
   * Handle disconnection in tournament waiting room (before semi-finals start)
   */
  handleWaitingRoomDisconnect(playerId, roomId, isExplicitLeave) {
    console.log(`🏆 Handling waiting room disconnect for player ${playerId}`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) return;

    // Clean up the player connection using base utility
    this.cleanupPlayerConnection(playerId);
    
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

    const disconnectionReason = isExplicitLeave ? 
        this.tournamentDisconnectionReasons.PLAYER_LEFT : 
        this.tournamentDisconnectionReasons.SEMI_FINAL_DISCONNECT;
    
    const actionText = isExplicitLeave ? 'left the semi-final' : 'disconnected during semi-final';
    console.log(`🏆 Semi-final: Player ${playerId} ${actionText}. Awarding win to ${remainingPlayer.id}`);
    
    // Mark game as over immediately
    room.isGameOver = true;
    
    // Create tournament-specific forfeit match data
    const baseMatchData = BaseDisconnectUtils.createBaseForfeitMatchData(
        room, 
        roomId, 
        remainingPlayer, 
        disconnectedPlayer, 
        actionText
    );

    // Send game end message to remaining player
    const gameEndMessage = {
        type: 'gameEnd',
        ...baseMatchData,
        matchType: 'semi-final',  // Critical for client detection
        tournamentStage: 'semifinal',
        gameStats: {
            ...baseMatchData.gameStats,
            totalRebounds: room.gameStats?.totalRebounds || 0
        },
        disconnectionReason,
        tournamentAdvancement: {
            stage: 'semifinal',
            result: 'victory_by_forfeit',
            message: 'Opponent disconnected. You advance to the final!',
            placement: 'advancing_to_final'
        },
        tournamentPlacements: {
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
        }
    };
    
    // Send directly to remaining player's WebSocket
    if (remainingPlayer.ws && remainingPlayer.ws.readyState === 1) {
        remainingPlayer.ws.send(JSON.stringify(gameEndMessage));
    }
    
    // Log the tournament forfeit
    LogUtils.logMatchCompletion(gameEndMessage);
    
    // Report results to external APIs
    BaseDisconnectUtils.reportResults(gameEndMessage);
    
    // Disconnect the forfeiting player (4th place)
    this.cleanupPlayerConnection(disconnectedPlayer.id);
    console.log(`🏆 Disconnected 4th place player: ${disconnectedPlayer.username}`);

    // Check if this was the last player in the room
    const isLastPlayer = room.players.length <= 1;
    if (isLastPlayer) {
        console.log(`🏆 Semi-final room ${roomId} is now empty (both players disconnected)`);
        tournamentManager._markSemiFinalAsEmpty(roomId);
        
        // Clean up the room immediately since it's empty
        gameStateManager.removeRoom(roomId);
        console.log(`🏆 Removed empty semi-final room ${roomId}`);
        return;
    }
    
    // If not empty, progress tournament with forfeit logic
    this.progressTournamentAfterSemiFinalForfeit(room, gameEndMessage, disconnectedPlayer, remainingPlayer);
    
    // Schedule room cleanup
    BaseDisconnectUtils.scheduleRoomCleanup(roomId, gameStateManager, 5000);
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

    const disconnectionReason = isExplicitLeave ? 
      this.tournamentDisconnectionReasons.FINAL_DISCONNECT : 
      this.tournamentDisconnectionReasons.FINAL_DISCONNECT;
    
    const actionText = isExplicitLeave ? 'left the final' : 'disconnected during final';
    const finalType = room.metadata?.finalMatch || 'unknown';
    console.log(`🏆 Final (${finalType}): Player ${playerId} ${actionText}. Awarding win to ${remainingPlayer.id}`);
    
    // Mark game as over immediately
    room.isGameOver = true;
    
    // Create tournament-specific forfeit match data
    const baseMatchData = BaseDisconnectUtils.createBaseForfeitMatchData(
      room, 
      roomId, 
      remainingPlayer, 
      disconnectedPlayer, 
      actionText
    );

    const matchData = {
      ...baseMatchData,
      tournamentStage: 'final',
      disconnectionReason,
      finalMatchType: room.metadata?.finalMatch
    };

    // Log the tournament forfeit
    LogUtils.logMatchCompletion(matchData);
    
    // Report results to external APIs
    BaseDisconnectUtils.reportResults(matchData);
    
    // Notify remaining player of final victory
    this.notifyTournamentRemainingPlayer(roomId, matchData, 'final');
    
    // Handle final completion through tournament manager
    try {
      tournamentManager.handleFinalCompletion(roomId, matchData);
    } catch (error) {
      console.error(`🏆 Error handling final completion after forfeit for room ${roomId}:`, error);
    }
    
    // Schedule room cleanup
    BaseDisconnectUtils.scheduleRoomCleanup(roomId, gameStateManager, 5000);
  }

  /**
   * Clean up player connection and associated data
   */
  cleanupPlayerConnection(playerId) {
    const player = gameStateManager.getPlayer(playerId);
    
    if (player && player.ws) {
      BaseDisconnectUtils.cleanupWebSocket(player.ws);
    }
    
    // Remove player from game state
    gameStateManager.removePlayer(playerId);
    
    // Clean up connection metadata
    this.connectionMetadata.delete(playerId);
    
    console.log(`🧹 Cleaned up tournament player connection ${playerId}`);
  }

  /**
   * Progress tournament bracket after semi-final forfeit
   */
  progressTournamentAfterSemiFinalForfeit(semiFinalRoom, matchData, disconnectedPlayer, remainingPlayer) {
    try {
      tournamentManager.handleSemiFinalCompletion(semiFinalRoom.id, matchData);
    } catch (error) {
      console.error('Error processing tournament progression after forfeit:', error);
    }
  }

  /**
   * Notify tournament forfeit winner
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
          stage: matchData.tournamentStage,
          result: 'victory_by_forfeit',
          message: matchData.tournamentStage === 'semifinal' 
            ? 'Opponent disconnected. You advance to the final!'
            : 'Opponent disconnected. You win the tournament!',
          placement: 'advancing_to_final'
        }
      };
      
      remainingPlayer.ws.send(JSON.stringify(gameEndMessage));
      
      // For semi-finals, also send waiting state
      if (matchData.tournamentStage === 'semifinal') {
        setTimeout(() => {
          if (remainingPlayer.ws?.readyState === 1) {
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
          }
        }, 1000);
      }
    } catch (error) {
      console.error(`🏆 Error notifying forfeit winner ${remainingPlayer.username}:`, error);
    }
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
    console.log(`🏆 Player ${playerId} is explicitly leaving the tournament in room ${roomId}`);
    playerManager.markPlayerLeaving(playerId);
    this.handleTournamentPlayerDisconnect(playerId, roomId);
  }
}

// Export the handler class
export const tournamentDisconnectionHandler = new TournamentDisconnectionHandler();