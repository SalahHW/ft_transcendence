/**
 * Tournament Manager
 * Main orchestrator for tournament management
 */

import { gameStateManager } from '../game/GameStateManager.js';
import { TournamentPhases, TournamentRoomTypes, TournamentConfig } from './constants.js';
import { TournamentRoomFactory } from './rooms/TournamentRoomFactory.js';
import { TournamentPlayerManager } from './waitingRoom/PlayerManager.js';
import { TournamentCleanupManager } from './cleanup/CleanupManager.js';
import { TournamentBroadcastManager } from './broadcast/BroadcastManager.js';
import { TournamentMatchManager } from './matchManagement/TournamentMatchManager.js';
import { TournamentTransferManager } from './playerManagement/TournamentTransferManager.js';
import { TournamentCommunicationManager } from './communication/TournamentCommunicationManager.js';
import { TournamentLifecycleManager } from './lifecycle/TournamentLifecycleManager.js';
import { assetDisposalManager } from './assetManagement/TournamentAssetDisposalManager.js';

/**
 * Tournament Manager
 */
export class TournamentManager {
  constructor() {
    this.tournaments = new Map(); // tournamentId -> tournament data
    this.waitingRooms = new Map(); // waitingRoomId -> waiting room data
    
    // Initialize managers with consolidated disconnect handler
    this.playerManager = new TournamentPlayerManager(this.waitingRooms, null);
    this.cleanupManager = new TournamentCleanupManager(this.waitingRooms, null);
    this.broadcastManager = new TournamentBroadcastManager(this.waitingRooms);
    
    // Initialize new managers
    this.matchManager = new TournamentMatchManager(this);
    this.transferManager = new TournamentTransferManager(this);
    this.communicationManager = new TournamentCommunicationManager(this);
    this.lifecycleManager = new TournamentLifecycleManager(this);
    
    // Start periodic cleanup of inactive players
    this.cleanupManager.startInactivityCleanup();
  }

  /**
   * Add player to tournament waiting room
   */
  async addPlayerToTournament(playerId, username) {
    const result = await this.playerManager.addPlayerToTournament(playerId, username);
    
    if (result.shouldStartTournament) {
      await this.startTournament(result.waitingRoom.id);
    }
    
    return {
      waitingRoomId: result.waitingRoom.id,
      playerCount: result.waitingRoom.players.length,
      maxPlayers: TournamentConfig.MAX_PLAYERS_PER_WAITING_ROOM
    };
  }

  /**
   * Remove player from tournament waiting room (explicit leave)
   */
  async removePlayerFromTournament(playerId, username) {
    return await this.playerManager.removePlayerFromTournament(playerId, username);
  }

  /**
   * Start tournament when waiting room is full
   */
  async startTournament(waitingRoomId) {
    console.log(`🏆 Starting tournament for waiting room ${waitingRoomId}`);
    
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) {
      console.error(`Waiting room data not found for ${waitingRoomId}`);
      return;
    }
    
    const waitingRoom = gameStateManager.getRoom(waitingRoomId);
    if (!waitingRoom || waitingRoom.players.length !== TournamentConfig.MAX_PLAYERS_PER_WAITING_ROOM) {
      console.error(`Invalid waiting room state for ${waitingRoomId}`);
      return;
    }
    
    // Check if all players have WebSocket connections
    const players = waitingRoom.players;
    const playersWithWebSocket = players.filter(p => p.ws && p.ws.readyState === 1);
    
    console.log(`🏆 Players with WebSocket: ${playersWithWebSocket.length}/${players.length}`);
    console.log(`🏆 Player assignments: [${players.map(p => `${p.username}(${p.id})`).join(', ')}]`);
    
    // If not all players are connected, wait and retry
    if (playersWithWebSocket.length < players.length) {
      console.log(`🏆 Waiting for all players to connect before starting tournament...`);
      setTimeout(async () => {
        await this.startTournament(waitingRoomId);
      }, 2000);
      return;
    }
    
    // Semi-final A: players 0 and 1
    const semiFinalA = waitingRoomData.tournamentRooms.semiFinalA;
    semiFinalA.addPlayer(players[0]);
    semiFinalA.addPlayer(players[1]);
    
    // Semi-final B: players 2 and 3
    const semiFinalB = waitingRoomData.tournamentRooms.semiFinalB;
    semiFinalB.addPlayer(players[2]);
    semiFinalB.addPlayer(players[3]);
    
    console.log(`🏆 Semi-Final A: [${semiFinalA.players.map(p => `${p.username}(${p.id})`).join(', ')}]`);
    console.log(`🏆 Semi-Final B: [${semiFinalB.players.map(p => `${p.username}(${p.id})`).join(', ')}]`);
    
    // Update tournament phase
    waitingRoomData.phase = TournamentPhases.SEMI_FINALS;
    
    console.log(`🏆 Tournament started: ${players[0].username} vs ${players[1].username} in Semi-Final A`);
    console.log(`🏆 Tournament started: ${players[2].username} vs ${players[3].username} in Semi-Final B`);
    
    // Mark waiting room as over
    waitingRoom.isGameOver = true;
    
    // Transfer WebSocket connections to semi-final rooms
    await this.transferManager.transferPlayersToSemiFinals(waitingRoomId, players);
  }

  /**
   * Handle player disconnection from tournament
   * This method is now called by the consolidated server-level handler
   */
  handlePlayerDisconnect(playerId, roomId) {
    // This method is kept for backward compatibility but the actual handling
    // is now done directly in the server-level TournamentDisconnectHandler
    console.log(`🏆 Tournament manager handlePlayerDisconnect called for player ${playerId} in room ${roomId}`);
    console.log(`🏆 Note: Actual disconnect handling is now done in server-level handler`);
  }

  /**
   * Get tournament statistics
   */
  getTournamentStats() {
    return {
      activeWaitingRooms: this.waitingRooms.size,
      totalTournaments: this.tournaments.size,
      waitingRoomsDetail: Array.from(this.waitingRooms.entries()).map(([id, data]) => ({
        id,
        playerCount: data.players.length,
        phase: data.phase,
        createdAt: data.createdAt
      }))
    };
  }

  /**
   * Get current player count for a specific waiting room
   */
  getWaitingRoomPlayerCount(waitingRoomId) {
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) {
      return null;
    }
    
    return {
      waitingRoomId,
      playerCount: waitingRoomData.players.length,
      maxPlayers: TournamentConfig.MAX_PLAYERS_PER_WAITING_ROOM,
      players: waitingRoomData.players.map(p => ({
        id: p.id,
        username: p.username,
        joinedAt: p.joinedAt
      }))
    };
  }

  /**
   * Get all waiting room player counts
   */
  getAllWaitingRoomCounts() {
    const counts = {};
    for (const [waitingRoomId, data] of this.waitingRooms) {
      counts[waitingRoomId] = {
        playerCount: data.players.length,
        maxPlayers: TournamentConfig.MAX_PLAYERS_PER_WAITING_ROOM,
        players: data.players.map(p => ({
          id: p.id,
          username: p.username,
          joinedAt: p.joinedAt
        }))
      };
    }
    return counts;
  }

  /**
   * Update player activity timestamp
   */
  updatePlayerActivity(playerId, waitingRoomId) {
    this.lifecycleManager.updatePlayerActivity(playerId, waitingRoomId);
  }

  /**
   * Handle tournament player WebSocket connection established
   */
  async handlePlayerWebSocketConnected(playerId, waitingRoomId) {
    await this.lifecycleManager.handlePlayerWebSocketConnected(playerId, waitingRoomId);
  }

  /**
   * Handle player leaving tournament (explicit leave button)
   */
  handlePlayerLeave(playerId, waitingRoomId) {
    this.lifecycleManager.handlePlayerLeave(playerId, waitingRoomId);
  }

  /**
   * Broadcast waiting room status to all players
   */
  broadcastWaitingRoomStatus(waitingRoomId) {
    this.communicationManager.broadcastWaitingRoomStatus(waitingRoomId);
  }

  /**
   * Handle semi-final match end and advance players to finals
   */
  async handleSemiFinalMatchEnd(waitingRoomId, roomId, matchData) {
    // Dispose assets between matches
    await assetDisposalManager.disposeBetweenMatches(roomId, 'tournament_semi_final');
    
    // Handle the match end and player advancement
    await this.matchManager.handleSemiFinalMatchEnd(waitingRoomId, roomId, matchData);
  }

  /**
   * Handle final match end and complete tournament
   */
  async handleFinalMatchEnd(waitingRoomId, roomId, matchData) {
    // Dispose assets between matches
    await assetDisposalManager.disposeBetweenMatches(roomId, 'tournament_final');
    
    // Handle the match end
    await this.matchManager.handleFinalMatchEnd(waitingRoomId, roomId, matchData);
  }

  /**
   * Get asset disposal status for a room
   */
  getAssetDisposalStatus(roomId) {
    return assetDisposalManager.getDisposalStatus(roomId);
  }

  /**
   * Get asset disposal logs for a room
   */
  getAssetDisposalLogs(roomId) {
    return assetDisposalManager.getDisposalLogs(roomId);
  }
}

// Create singleton instance
export const tournamentManager = new TournamentManager(); 