import { roomManager } from './RoomManager.js';
import { gameEngine } from '../game/GameEngine.js';
import { LogUtils } from '../utils/helpers.js';
import { BaseDisconnectUtils } from '../server/disconnectHandler.js';

// Import all extracted modules
import * as TournamentUtils from '../tournament/utils/TournamentUtils.js';
import * as TournamentStateManager from '../tournament/state/TournamentStateManager.js';
import * as TournamentRoomManager from '../tournament/room/TournamentRoomManager.js';
import * as TournamentDisconnectHandler from '../tournament/disconnect/TournamentDisconnectHandler.js';
import * as TournamentFinalManager from '../tournament/finals/TournamentFinalManager.js';
import * as TournamentProgressionManager from '../tournament/progression/TournamentProgressionManager.js';

/**
 * Handles tournament-specific room management and matchmaking
 * 
 * ⭐ RACE CONDITION FIX:
 * - Final game initialization is coordinated with semi-final splash screen timing
 * - Only starts final games when BOTH semi-finals complete (6000ms delay for splash screens)
 * - Prevents visual conflicts between semi-final results and next opponent screens
 */
export class TournamentManager {
  constructor() {
    this.roomManager = roomManager;
    this._tournamentCounter = 0; // Counter for unique tournament IDs
  }

  /**
   * Generate a unique tournament identifier
   * @returns {string} - Unique tournament ID
   */
  _generateTournamentId() {
    return TournamentRoomManager.generateTournamentId({ counter: this._tournamentCounter });
  }

  /**
   * Find suitable tournament room for a player with enhanced isolation
   */
  findSuitableTournamentRoom(player, preferences = {}) {
    return TournamentRoomManager.findSuitableTournamentRoom(this.roomManager, player, preferences);
  }

  /**
   * Create a new tournament room with unique tournament-specific naming
   */
  createTournamentRoom(player, preferences = {}) {
    console.log(`🏆 Creating new tournament room for player ${player.id}`);
    const room = TournamentRoomManager.createTournamentRoom(this.roomManager, player, preferences);
    console.log(`🏆 Tournament room ${room.id} created successfully with tournament ID ${room.metadata.tournamentId}`);
    return room;
  }

  /**
   * Handle tournament player room assignment
   * @param {Object} player - The tournament player
   * @param {Object} preferences - Player preferences
   * @returns {Object} - Room assignment result { room, roomId, role }
   */
  handleTournamentPlayer(player, preferences = {}) {
    console.log(`🏆 Processing tournament player ${player.id} (${player.username})`);
    const result = TournamentRoomManager.handleTournamentPlayer(this.roomManager, player, preferences);
    console.log(`🏆 Tournament player ${player.id} assigned to room ${result.roomId} as role ${result.role} (${result.room.players.length}/4 players)`);
    return result;
  }

  /**
   * Create semi-final matches when tournament room is full (4 players)
   * @param {Object} waitingRoom - The full tournament waiting room
   */
  createSemiFinalMatches(waitingRoom) {
    console.log(`🏆 Splitting tournament room ${waitingRoom.id} into semi-final matches...`);
    TournamentRoomManager.createSemiFinalMatches(this.roomManager, waitingRoom);
    console.log(`🏆 Tournament waiting room ${waitingRoom.id} split successfully!`);
  }

  /**
   * Check if a room is a tournament room
   * @param {Object} room - The room to check
   * @returns {boolean} - True if tournament room
   */
  isTournamentRoom(room) {
    return TournamentStateManager.isTournamentRoom(room);
  }

  /**
   * Check if a room is a semi-final room
   * @param {Object} room - The room to check
   * @returns {boolean} - True if semi-final room
   */
  isSemiFinalRoom(room) {
    return TournamentStateManager.isSemiFinalRoom(room);
  }

  /**
   * Check if a room is a final room
   * @param {Object} room - The room to check
   * @returns {boolean} - True if final room
   */
  isFinalRoom(room) {
    return TournamentStateManager.isFinalRoom(room);
  }

  /**
   * Handle semi-final game completion and transfer players to final rooms
   * @param {string} semiFinalRoomId - The semi-final room that just ended
   * @param {Object} matchData - Match data from game engine
   */
  handleSemiFinalCompletion(semiFinalRoomId, matchData) {
    console.log(`🏆 Semi-final ${semiFinalRoomId} completed! Processing tournament advancement...`);
    TournamentProgressionManager.handleSemiFinalCompletion(
      semiFinalRoomId, 
      matchData, 
      this.roomManager, 
      gameEngine, 
      TournamentDisconnectHandler, 
      TournamentFinalManager, 
      TournamentStateManager
    );
  }

  /**
   * Handle final match completion
   * @param {string} finalRoomId - The ID of the final room that completed
   * @param {Object} matchData - Match result data
   */
  handleFinalCompletion(finalRoomId, matchData) {
    console.log(`🏆 FINAL COMPLETION: Handling final match completion for room ${finalRoomId}`);
    TournamentProgressionManager.handleFinalCompletion(finalRoomId, matchData, this.roomManager);
  }

  /**
   * Get tournament room statistics
   * @returns {Object} - Tournament room stats
   */
  getTournamentStats() {
    const allRooms = this.roomManager.getAllRooms();
    return TournamentUtils.getTournamentStats(
      allRooms, 
      TournamentStateManager.isTournamentRoom, 
      TournamentStateManager.isSemiFinalRoom, 
      TournamentStateManager.isFinalRoom
    );
  }

  /**
   * Mark a semi-final room as empty (both players disconnected)
   */
  _markSemiFinalAsEmpty(semiFinalRoomId) {
    TournamentStateManager.markSemiFinalAsEmpty(semiFinalRoomId, this.roomManager);
  }

  /**
   * Get the other semi-final room in the tournament
   * @param {string} currentSemiFinalRoomId - The current semi-final room ID
   * @param {string} tournamentId - The tournament ID
   * @returns {Object|null} - The other semi-final room, or null if not found
   */
  _getOtherSemiFinalRoom(currentSemiFinalRoomId, tournamentId) {
    return TournamentStateManager.getOtherSemiFinalRoom(currentSemiFinalRoomId, tournamentId, this.roomManager);
  }

  /**
   * Check if the other semi-final room is empty
   * @param {string} currentSemiFinalRoomId - The current semi-final room ID
   * @param {string} tournamentId - The tournament ID
   * @returns {boolean} - True if the other semi-final is empty or marked as empty
   */
  _isOtherSemiFinalEmpty(currentSemiFinalRoomId, tournamentId) {
    return TournamentStateManager.isOtherSemiFinalEmpty(currentSemiFinalRoomId, tournamentId, this.roomManager);
  }

  /**
   * Send direct final placement messages to players
   */
  _sendDirectFinalPlacement(winnerPlayer, loserPlayer, matchData, semiFinalRoomId) {
    TournamentDisconnectHandler.sendDirectFinalPlacement(winnerPlayer, loserPlayer, matchData, semiFinalRoomId);
  }

  /**
   * Check if both semi-finals are completed by looking at final room states
   * @param {string} tournamentId - The tournament ID
   * @returns {boolean} - True if both semi-finals are completed
   */
  _areBothSemiFinalsCompleted(tournamentId) {
    return TournamentStateManager.areBothSemiFinalsCompleted(tournamentId, this.roomManager);
  }

  /**
   * Handle incomplete final rooms due to forfeits
   * @param {Object} finalRoomA - The winners final room
   * @param {Object} finalRoomB - The losers final room
   * @param {string} tournamentId - The tournament ID
   */
  _handleIncompleteFinalRooms(finalRoomA, finalRoomB, tournamentId) {
    TournamentFinalManager.handleIncompleteFinalRooms(finalRoomA, finalRoomB, tournamentId, this.roomManager, gameEngine);
  }

  /**
   * Handle incomplete final rooms after delay to avoid race conditions
   * @param {Object} finalRoomA - The winners final room
   * @param {Object} finalRoomB - The losers final room
   * @param {string} tournamentId - The tournament ID
   */
  _handleIncompleteFinalRoomsAfterDelay(finalRoomA, finalRoomB, tournamentId) {
    TournamentFinalManager.handleIncompleteFinalRoomsAfterDelay(finalRoomA, finalRoomB, tournamentId, this.roomManager, gameEngine);
  }

  /**
   * Start both final games with proper timing coordination
   */
  _startBothFinalsWithTiming(finalRoomA, finalRoomB, tournamentId) {
    TournamentFinalManager.startBothFinalsWithTiming(finalRoomA, finalRoomB, tournamentId, this.roomManager, gameEngine);
  }

  /**
   * Start winners final only (when losers final was forfeited)
   */
  _startWinnersFinalWithTiming(finalRoomA, tournamentId) {
    TournamentFinalManager.startWinnersFinalWithTiming(finalRoomA, tournamentId, this.roomManager, gameEngine);
  }

  /**
   * Start losers final only (edge case)
   */
  _startLosersFinalWithTiming(finalRoomB, tournamentId) {
    TournamentFinalManager.startLosersFinalWithTiming(finalRoomB, tournamentId, this.roomManager, gameEngine);
  }

  /**
   * Mark the losers final room with forfeit information
   * @param {Object} losersFinalRoom - The losers final room
   * @param {Object} forfeitPlayer - The player who forfeited
   * @param {string} reason - The reason for forfeit
   */
  _markLosersFinalWithForfeit(losersFinalRoom, forfeitPlayer, reason) {
    TournamentDisconnectHandler.markLosersFinalWithForfeit(losersFinalRoom, forfeitPlayer, reason);
  }

  /**
   * Check if a player is alone in the entire tournament and award automatic victory
   * @param {string} tournamentId - The tournament ID to check
   * @returns {Object|null} - Player object if alone, null otherwise
   */
  _checkForLonePlayerInTournament(tournamentId) {
    return TournamentDisconnectHandler.checkForLonePlayerInTournament(tournamentId, this.roomManager);
  }

  /**
   * Award automatic tournament victory to a lone player
   * @param {Object} lonePlayer - The player who is alone in the tournament
   * @param {string} tournamentId - The tournament ID
   */
  _awardAutomaticTournamentVictory(lonePlayer, tournamentId) {
    TournamentDisconnectHandler.awardAutomaticTournamentVictory(lonePlayer, tournamentId, this.roomManager, LogUtils, BaseDisconnectUtils);
  }

  /**
   * Check if all players in the final rooms are from the same semi-final
   * @param {Array} winnersFinalPlayers - Array of players in winners final
   * @param {Array} losersFinalPlayers - Array of players in losers final
   * @param {string} tournamentId - The tournament ID
   * @returns {boolean} - True if all players are from the same semi-final
   */
  _arePlayersFromSameSemiFinal(winnersFinalPlayers, losersFinalPlayers, tournamentId) {
    return TournamentStateManager.arePlayersFromSameSemiFinal(winnersFinalPlayers, losersFinalPlayers, tournamentId, this.roomManager);
  }

  /**
   * Get placement suffix for display (1st, 2nd, 3rd, 4th)
   * @param {number} placement - The placement number
   * @returns {string} The placement suffix string
   */
  _getPlacementSuffix(placement) {
    return TournamentUtils.getPlacementSuffix(placement);
  }
}

// Create singleton instance
export const tournamentManager = new TournamentManager(); 