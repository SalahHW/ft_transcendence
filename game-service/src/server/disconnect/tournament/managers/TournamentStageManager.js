import { gameStateManager } from '../../../../game/GameStateManager.js';
import { gameEngine } from '../../../../game/GameEngine.js';
import { BaseDisconnectUtils } from '../../../disconnectHandler.js';
import { TournamentDisconnectUtils } from '../utils/TournamentDisconnectUtils.js';
import { TournamentForfeitManager } from './TournamentForfeitManager.js';
import { TournamentNotificationService } from '../services/TournamentNotificationService.js';
import { TournamentProgressionManager } from './TournamentProgressionManager.js';

/**
 * Manages stage-specific tournament disconnect handling
 */
export class TournamentStageManager {
  /**
   * Handle disconnection in tournament waiting room (before semi-finals start)
   */
  static handleWaitingRoomDisconnect(playerId, roomId, isExplicitLeave, connectionMetadata) {
    console.log(`🏆 Handling waiting room disconnect for player ${playerId}`);
    
    const room = gameStateManager.getRoom(roomId);
    if (!room) return;

    // Clean up the player connection using base utility
    TournamentDisconnectUtils.cleanupPlayerConnection(playerId, connectionMetadata);
    
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
  static handleSemiFinalDisconnect(playerId, roomId, isExplicitLeave, tournamentManager, connectionMetadata) {
    console.log(`🏆 Handling semi-final disconnect for player ${playerId} in room ${roomId}`);
    
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`🏆 Could not find players in semi-final room ${roomId} for disconnect handling`);
      return;
    }

    const disconnectionReason = isExplicitLeave ? 
      'player_left' : 
      'semi_final_disconnect';
    
    const actionText = isExplicitLeave ? 'left the semi-final' : 'disconnected during semi-final';
    console.log(`🏆 Semi-final: Player ${playerId} ${actionText}. Awarding win to ${remainingPlayer.id}`);
    
    // Mark game as over immediately
    room.isGameOver = true;
    
    // Create tournament-specific forfeit match data
    const gameEndMessage = TournamentForfeitManager.createSemiFinalForfeitMatchData(
      room, 
      roomId, 
      remainingPlayer, 
      disconnectedPlayer, 
      actionText, 
      disconnectionReason
    );
    
    // Send directly to remaining player's WebSocket
    if (remainingPlayer.ws && remainingPlayer.ws.readyState === 1) {
      remainingPlayer.ws.send(JSON.stringify(gameEndMessage));
      
      // 🏆 FORFEIT WINNER PING: Send waiting message to trigger ping functionality
      TournamentNotificationService.notifyTournamentForfeitWinner(roomId, remainingPlayer, gameEndMessage);
    }
    
    // Process the forfeit
    TournamentForfeitManager.processTournamentForfeit(gameEndMessage, disconnectedPlayer);

    // Check if this was the last player in the room
    const isEmpty = TournamentForfeitManager.handleEmptyRoomAfterForfeit(room, roomId, tournamentManager);
    if (isEmpty) {
      return;
    }
    
    // If not empty, progress tournament with forfeit logic
    TournamentProgressionManager.progressTournamentAfterSemiFinalForfeit(room, gameEndMessage, disconnectedPlayer, remainingPlayer, tournamentManager);
    
    // Schedule room cleanup
    BaseDisconnectUtils.scheduleRoomCleanup(roomId, gameStateManager, 5000);
    
    // Schedule lone player check
    TournamentForfeitManager.scheduleLonePlayerCheck(room, tournamentManager);
  }

  /**
   * Handle disconnection during final match
   */
  static handleFinalDisconnect(playerId, roomId, isExplicitLeave, tournamentManager, connectionMetadata) {
    console.log(`🏆 Handling final disconnect for player ${playerId} in room ${roomId}`);
    
    const room = gameStateManager.getRoom(roomId);
    const remainingPlayer = room.players.find(p => p.id !== playerId);
    const disconnectedPlayer = room.players.find(p => p.id === playerId);
    
    if (!remainingPlayer || !disconnectedPlayer) {
      console.error(`🏆 Could not find players in final room ${roomId} for disconnect handling`);
      return;
    }

    const disconnectionReason = 'final_disconnect';
    const actionText = isExplicitLeave ? 'left the final' : 'disconnected during final';
    const finalType = room.metadata?.finalMatch || 'unknown';
    console.log(`🏆 Final (${finalType}): Player ${playerId} ${actionText}. Awarding win to ${remainingPlayer.id}`);
    
    // Mark game as over immediately
    room.isGameOver = true;
    
    // Create tournament-specific forfeit match data
    const matchData = TournamentForfeitManager.createFinalForfeitMatchData(
      room, 
      roomId, 
      remainingPlayer, 
      disconnectedPlayer, 
      actionText, 
      disconnectionReason
    );

    // Process the forfeit
    TournamentForfeitManager.processTournamentForfeit(matchData, disconnectedPlayer);
    
    // Notify remaining player of final victory
    TournamentNotificationService.notifyTournamentRemainingPlayer(roomId, matchData, 'final');
    
    // Handle final completion through tournament manager
    try {
      tournamentManager.handleFinalCompletion(roomId, matchData);
    } catch (error) {
      console.error(`🏆 Error handling final completion after forfeit for room ${roomId}:`, error);
    }
    
    // Schedule room cleanup
    BaseDisconnectUtils.scheduleRoomCleanup(roomId, gameStateManager, 5000);
    
    // Schedule lone player check
    TournamentForfeitManager.scheduleLonePlayerCheck(room, tournamentManager);
  }
}

 