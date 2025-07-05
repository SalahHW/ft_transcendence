/**
 * Tournament Room Factory
 * Handles creation of tournament rooms
 */

import { roomManager } from '../../room/RoomManager.js';
import { gameStateManager } from '../../game/GameStateManager.js';
import { TournamentPhases, TournamentRoomTypes } from '../constants.js';

export class TournamentRoomFactory {
  /**
   * Create all tournament rooms for a given waiting room
   */
  static createTournamentRooms(waitingRoomId) {
    const rooms = {};
    
    // Semi-final rooms
    rooms.semiFinalA = roomManager.createRoom(`${waitingRoomId}SA`, {
      maxPlayers: 2,
      matchType: 'tournament',
      metadata: {
        tournamentPhase: TournamentPhases.SEMI_FINALS,
        roomType: TournamentRoomTypes.SEMI_FINAL_A,
        waitingRoomId: waitingRoomId,
        createdAt: Date.now()
      }
    });
    
    // Initialize animation status for semi-final A
    gameStateManager.initializeAnimationStatus(`${waitingRoomId}SA`);
    
    rooms.semiFinalB = roomManager.createRoom(`${waitingRoomId}SB`, {
      maxPlayers: 2,
      matchType: 'tournament',
      metadata: {
        tournamentPhase: TournamentPhases.SEMI_FINALS,
        roomType: TournamentRoomTypes.SEMI_FINAL_B,
        waitingRoomId: waitingRoomId,
        createdAt: Date.now()
      }
    });
    
    // Initialize animation status for semi-final B
    gameStateManager.initializeAnimationStatus(`${waitingRoomId}SB`);
    
    // Final rooms
    rooms.winnerFinal = roomManager.createRoom(`${waitingRoomId}winFin`, {
      maxPlayers: 2,
      matchType: 'tournament',
      metadata: {
        tournamentPhase: TournamentPhases.WINNER_FINAL,
        roomType: TournamentRoomTypes.WINNER_FINAL,
        waitingRoomId: waitingRoomId,
        createdAt: Date.now()
      }
    });
    
    // Initialize animation status for winner final
    gameStateManager.initializeAnimationStatus(`${waitingRoomId}winFin`);
    
    rooms.loserFinal = roomManager.createRoom(`${waitingRoomId}winLos`, {
      maxPlayers: 2,
      matchType: 'tournament',
      metadata: {
        tournamentPhase: TournamentPhases.LOSER_FINAL,
        roomType: TournamentRoomTypes.LOSER_FINAL,
        waitingRoomId: waitingRoomId,
        createdAt: Date.now()
      }
    });
    
    // Initialize animation status for loser final
    gameStateManager.initializeAnimationStatus(`${waitingRoomId}winLos`);
    
    return rooms;
  }

  /**
   * Create new tournament waiting room
   */
  static createTournamentWaitingRoom(waitingRoomId) {
    const waitingRoom = roomManager.createRoom(waitingRoomId, {
      maxPlayers: 4,
      matchType: 'tournament',
      metadata: {
        tournamentPhase: TournamentPhases.WAITING,
        roomType: TournamentRoomTypes.WAITING,
        createdAt: Date.now()
      }
    });
    
    // Initialize animation status for waiting room
    gameStateManager.initializeAnimationStatus(waitingRoomId);
    
    return waitingRoom;
  }

  /**
   * Generate unique tournament ID
   */
  static generateTournamentId() {
    return `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 