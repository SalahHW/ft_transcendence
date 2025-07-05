/**
 * Tournament Manager
 * Main orchestrator for tournament management
 */

import { gameStateManager } from '../game/GameStateManager.js';
import { TournamentPhases, TournamentRoomTypes, TournamentConfig } from './constants.js';
import { TournamentRoomFactory } from './rooms/TournamentRoomFactory.js';
import { TournamentPlayerManager } from './waitingRoom/PlayerManager.js';
import { TournamentDisconnectHandler } from './disconnect/DisconnectHandler.js';
import { TournamentCleanupManager } from './cleanup/CleanupManager.js';
import { TournamentBroadcastManager } from './broadcast/BroadcastManager.js';

/**
 * Tournament Manager
 */
export class TournamentManager {
  constructor() {
    this.tournaments = new Map(); // tournamentId -> tournament data
    this.waitingRooms = new Map(); // waitingRoomId -> waiting room data
    
    // Initialize managers
    this.disconnectHandler = new TournamentDisconnectHandler(this.waitingRooms);
    this.playerManager = new TournamentPlayerManager(this.waitingRooms, this.disconnectHandler);
    this.cleanupManager = new TournamentCleanupManager(this.waitingRooms, this.disconnectHandler);
    this.broadcastManager = new TournamentBroadcastManager(this.waitingRooms);
    
    // Start periodic cleanup of inactive players
    this.cleanupManager.startInactivityCleanup();
  }

  /**
   * Add player to tournament waiting room
   */
  async addPlayerToTournament(playerId, username) {
    const result = await this.playerManager.addPlayerToTournament(playerId, username);
    
    if (result.shouldStartTournament) {
      this.startTournament(result.waitingRoom.id);
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
  removePlayerFromTournament(playerId, username) {
    return this.playerManager.removePlayerFromTournament(playerId, username);
  }

  /**
   * Start tournament when waiting room is full
   */
  startTournament(waitingRoomId) {
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
      setTimeout(() => {
        this.startTournament(waitingRoomId);
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
    this.transferPlayersToSemiFinals(waitingRoomId, players);
  }

  /**
   * Transfer players' WebSocket connections to their semi-final rooms
   */
  transferPlayersToSemiFinals(waitingRoomId, players) {
    // Transferring WebSocket connections to semi-final rooms
    
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) {
      console.error(`Waiting room data not found for transfer`);
      return;
    }
    
    // Transfer players to Semi-Final A
    const semiFinalA = waitingRoomData.tournamentRooms.semiFinalA;
    const player0 = players[0];
    const player1 = players[1];
    
    // Transfer player 0 to Semi-Final A
    if (player0.ws && player0.ws.readyState === 1) {
      this.broadcastManager.broadcastMatchAssignment(
        player0.id, 
        semiFinalA.id, 
        player1.id, 
        player1.username, 
        'tournament_semi_final'
      );
      
      // Update player's room assignment
      player0.assignToRoom(semiFinalA.id, 0);
      player0.ws.roomId = semiFinalA.id;
    }
    
    // Transfer player 1 to Semi-Final A
    if (player1.ws && player1.ws.readyState === 1) {
      this.broadcastManager.broadcastMatchAssignment(
        player1.id, 
        semiFinalA.id, 
        player0.id, 
        player0.username, 
        'tournament_semi_final'
      );
      
      // Update player's room assignment
      player1.assignToRoom(semiFinalA.id, 1);
      player1.ws.roomId = semiFinalA.id;
    }
    
    // Transfer players to Semi-Final B
    const semiFinalB = waitingRoomData.tournamentRooms.semiFinalB;
    const player2 = players[2];
    const player3 = players[3];
    
    // Transfer player 2 to Semi-Final B
    if (player2.ws && player2.ws.readyState === 1) {
      this.broadcastManager.broadcastMatchAssignment(
        player2.id, 
        semiFinalB.id, 
        player3.id, 
        player3.username, 
        'tournament_semi_final'
      );
      
      // Update player's room assignment
      player2.assignToRoom(semiFinalB.id, 0);
      player2.ws.roomId = semiFinalB.id;
      console.log(`🏆 Transferred ${player2.username}(${player2.id}) to room ${semiFinalB.id}, ws.roomId: ${player2.ws.roomId}`);
    } else {
      console.error(`🏆 Player ${player2.username}(${player2.id}) not ready for transfer to Semi-Final B`);
    }
    
    // Transfer player 3 to Semi-Final B
    if (player3.ws && player3.ws.readyState === 1) {
      this.broadcastManager.broadcastMatchAssignment(
        player3.id, 
        semiFinalB.id, 
        player2.id, 
        player2.username, 
        'tournament_semi_final'
      );
      
      // Update player's room assignment
      player3.assignToRoom(semiFinalB.id, 1);
      player3.ws.roomId = semiFinalB.id;
      console.log(`🏆 Transferred ${player3.username}(${player3.id}) to room ${semiFinalB.id}, ws.roomId: ${player3.ws.roomId}`);
    } else {
      console.error(`🏆 Player ${player3.username}(${player3.id}) not ready for transfer to Semi-Final B`);
    }
    
    // Clear animation status for both semi-final rooms to ensure clean state
    gameStateManager.clearAnimationStatus(semiFinalA.id);
    gameStateManager.clearAnimationStatus(semiFinalB.id);
    
    // Wait a moment for transfers to complete, then check readiness
    setTimeout(() => {
      this.checkSemiFinalReadiness(waitingRoomId);
    }, 1000);
  }

  /**
   * Check if all players are ready in their semi-final rooms
   */
  checkSemiFinalReadiness(waitingRoomId) {
    console.log(`🏆 Checking semi-final readiness for tournament ${waitingRoomId}`);
    
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) {
      console.error(`Waiting room data not found for readiness check`);
      return;
    }
    
    const semiFinalA = waitingRoomData.tournamentRooms.semiFinalA;
    const semiFinalB = waitingRoomData.tournamentRooms.semiFinalB;
    
    // Check if both semi-final rooms are ready
    const roomAReady = semiFinalA.players.length === 2 && 
                      semiFinalA.players.every(p => p.ws && p.ws.readyState === 1);
    const roomBReady = semiFinalB.players.length === 2 && 
                      semiFinalB.players.every(p => p.ws && p.ws.readyState === 1);
    
    console.log(`🏆 Room readiness check:`);
    console.log(`  Semi-Final A: ${semiFinalA.players.length}/2 players, ready: ${roomAReady}`);
    console.log(`  Semi-Final B: ${semiFinalB.players.length}/2 players, ready: ${roomBReady}`);
    console.log(`  Semi-Final A players: [${semiFinalA.players.map(p => `${p.username}(${p.id})`).join(', ')}]`);
    console.log(`  Semi-Final B players: [${semiFinalB.players.map(p => `${p.username}(${p.id})`).join(', ')}]`);
    
    if (roomAReady && roomBReady) {
      console.log(`🏆 All semi-final rooms ready, starting matches`);
      this.startSemiFinalMatches(waitingRoomId);
    } else {
      console.log(`🏆 Semi-final rooms not ready yet. A: ${roomAReady}, B: ${roomBReady}`);
      // Retry after a delay
      setTimeout(() => {
        this.checkSemiFinalReadiness(waitingRoomId);
      }, 2000);
    }
  }

  /**
   * Start the semi-final matches with splash screens
   */
  startSemiFinalMatches(waitingRoomId) {
    // Starting semi-final matches for tournament
    
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) {
      console.error(`Waiting room data not found for starting matches`);
      return;
    }
    
    const semiFinalA = waitingRoomData.tournamentRooms.semiFinalA;
    const semiFinalB = waitingRoomData.tournamentRooms.semiFinalB;
    
    // Start Semi-Final A
    if (semiFinalA.players.length === 2) {
      const player0 = semiFinalA.players[0];
      const player1 = semiFinalA.players[1];
      
      // Starting Semi-Final A
      
      // Send game initialization to both players
      [player0, player1].forEach((player, index) => {
        if (player.ws && player.ws.readyState === 1) {
          const gameInitData = {
            type: 'gameInit',
            roomId: semiFinalA.id,
            playerId: player.id,
            opponentId: index === 0 ? player1.id : player0.id,
            playerName: player.username,
            opponentName: index === 0 ? player1.username : player0.username,
            role: index, // 0 for player0, 1 for player1
            matchType: 'tournament_semi_final'
          };
          
          try {
            player.ws.send(JSON.stringify(gameInitData));
            console.log(`🏆 Sent game init to ${player.username}(${player.id}) in Semi-Final A`);
          } catch (error) {
            console.error(`Failed to send game init to ${player.username}:`, error);
          }
        } else {
          console.error(`🏆 Player ${player.username}(${player.id}) not ready for game init in Semi-Final A`);
        }
      });
    }
    
    // Start Semi-Final B
    if (semiFinalB.players.length === 2) {
      const player2 = semiFinalB.players[0];
      const player3 = semiFinalB.players[1];
      
      // Starting Semi-Final B
      
      // Send game initialization to both players
      [player2, player3].forEach((player, index) => {
        if (player.ws && player.ws.readyState === 1) {
          const gameInitData = {
            type: 'gameInit',
            roomId: semiFinalB.id,
            playerId: player.id,
            opponentId: index === 0 ? player3.id : player2.id,
            playerName: player.username,
            opponentName: index === 0 ? player3.username : player2.username,
            role: index, // 0 for player2, 1 for player3
            matchType: 'tournament_semi_final'
          };
          
          try {
            player.ws.send(JSON.stringify(gameInitData));
            console.log(`🏆 Sent game init to ${player.username}(${player.id}) in Semi-Final B`);
          } catch (error) {
            console.error(`Failed to send game init to ${player.username}:`, error);
          }
        } else {
          console.error(`🏆 Player ${player.username}(${player.id}) not ready for game init in Semi-Final B`);
        }
      });
    }
  }

  /**
   * Handle player disconnection from tournament
   */
  handlePlayerDisconnect(playerId, roomId) {
    this.disconnectHandler.handlePlayerDisconnect(playerId, roomId);
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
    this.playerManager.updatePlayerActivity(playerId, waitingRoomId);
  }

  /**
   * Handle tournament player WebSocket connection established
   */
  handlePlayerWebSocketConnected(playerId, waitingRoomId) {
    this.playerManager.handlePlayerWebSocketConnected(playerId, waitingRoomId);
    
    // Check if tournament has already started and this is a late-connecting player
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    if (waitingRoomData && waitingRoomData.phase === TournamentPhases.SEMI_FINALS) {
      console.log(`🏆 Late-connecting player ${playerId} in tournament ${waitingRoomId}`);
      this.handleLateConnectingPlayer(playerId, waitingRoomId);
    }
  }

  /**
   * Handle player connecting after tournament has started
   */
  handleLateConnectingPlayer(playerId, waitingRoomId) {
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    if (!waitingRoomData) return;
    
    const waitingRoom = gameStateManager.getRoom(waitingRoomId);
    if (!waitingRoom) return;
    
    // Find the player
    const player = waitingRoom.players.find(p => p.id === playerId);
    if (!player) return;
    
    // Find which semi-final room this player should be in
    const semiFinalA = waitingRoomData.tournamentRooms.semiFinalA;
    const semiFinalB = waitingRoomData.tournamentRooms.semiFinalB;
    
    let targetRoom = null;
    let role = -1;
    
    if (semiFinalA.players.some(p => p.id === playerId)) {
      targetRoom = semiFinalA;
      role = semiFinalA.players.findIndex(p => p.id === playerId);
    } else if (semiFinalB.players.some(p => p.id === playerId)) {
      targetRoom = semiFinalB;
      role = semiFinalB.players.findIndex(p => p.id === playerId);
    }
    
    if (targetRoom && player.ws && player.ws.readyState === 1) {
      console.log(`🏆 Transferring late-connecting player ${player.username} to ${targetRoom.id}`);
      
      // Update player's room assignment
      player.assignToRoom(targetRoom.id, role);
      player.ws.roomId = targetRoom.id;
      
      // Send game initialization
      const opponent = targetRoom.players.find(p => p.id !== playerId);
      if (opponent) {
        const gameInitData = {
          type: 'gameInit',
          roomId: targetRoom.id,
          playerId: player.id,
          opponentId: opponent.id,
          playerName: player.username,
          opponentName: opponent.username,
          role: role,
          matchType: 'tournament_semi_final'
        };
        
        try {
          player.ws.send(JSON.stringify(gameInitData));
          console.log(`🏆 Sent game init to late-connecting player ${player.username}`);
        } catch (error) {
          console.error(`Failed to send game init to late-connecting player ${player.username}:`, error);
        }
      }
    }
  }

  /**
   * Send waiting room status to all connected players
   */
  broadcastWaitingRoomStatus(waitingRoomId) {
    this.broadcastManager.broadcastWaitingRoomStatus(waitingRoomId);
  }

  /**
   * Handle player leaving tournament (explicit leave button)
   */
  handlePlayerLeave(playerId, waitingRoomId) {
    const result = this.playerManager.handlePlayerLeave(playerId, waitingRoomId);
    
    if (result && result.shouldCleanup) {
      this.cleanupManager.cleanupWaitingRoom(waitingRoomId);
    }
    
    // Notify remaining players
    this.broadcastManager.broadcastWaitingRoomStatus(waitingRoomId);
  }
}

// Export singleton instance
export const tournamentManager = new TournamentManager(); 