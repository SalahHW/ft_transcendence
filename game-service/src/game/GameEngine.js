import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import { reportMatchResultsToAPI } from '../server/api.js';
import { gameStateManager } from './GameStateManager.js';
import {  WebSocketUtils } from '../utils/helpers.js';
import { roomMatchmaker } from '../room/RoomMatchmaker.js';
import { createWaitingMessage } from '../player/playerStatus.js';
import { GAME_CONFIG } from '../core/constants.js';
import { PlayerStates } from '../server/disconnect/BaseDisconnectHandler.js';

/**
 * Core game engine responsible for game logic orchestration
 */
export class GameEngine {
  constructor() {
    this.stateManager = gameStateManager;
  }

  /**
   * Check if room is ready and start game if conditions are met
   */
  async checkRoomReady(roomId) {
    const room = this.stateManager.getRoom(roomId);
    if (!room || room.ready) return;

    if (room.isReadyForGame()) {
      await this._startGame(room, roomId);
    } else {
      this._notifyWaitingStatus(room);
    }
  }

  /**
   * Send ball update to room
   */
  sendBallUpdate(roomId) {
    const room = this.stateManager.getRoom(roomId);
    if (!room || room.players.length !== 2) return;

    if (!room.ballUpdateSent) {
      console.log(`Sending ballUpdate for room ${roomId} at ${Date.now()}`);
      this.sendBallUpdateForced(roomId);
    }
  }

  /**
   * Force send ball update to room
   */
  async sendBallUpdateForced(roomId) {
    const room = this.stateManager.getRoom(roomId);
    if (!room || room.players.length !== 2) {
      console.warn(`Cannot send forced ballUpdate for room ${roomId}: invalid state`, {
        exists: !!room,
        playerCount: room?.players.length
      });
      return;
    }

    // ⭐ CRITICAL FIX: Prevent ball recreation if it has been disposed
    if (room.ballDisposed) {
      console.warn(`Cannot send forced ballUpdate for room ${roomId}: ball has been disposed and cannot be recreated`);
      return;
    }

    if (!room.ball) {
      this._initializeBall(room);
    }

    this._ensureBallRespawnState(room);
    const ballState = this._createBallState(room.ball);

    console.log(`Sending initial ballUpdate for room ${roomId} at ${Date.now()}:`, ballState);
    this.broadcastToRoom(roomId, {
      type: 'ballUpdate',
      ballState,
      isInitialSpawn: !room.ballUpdateSent,
      isScoreRespawn: false
    });

    room.ballUpdateSent = true;
    room.ballUpdateTimeout = null;
  }

  /**
   * Broadcast message to all players in a room
   */
  broadcastToRoom(roomId, message) {
    const json = JSON.stringify(message);
    const room = this.stateManager.getRoom(roomId) || { players: [] };
    
    const connectedPlayers = room.players.filter(p => p.ws && p.ws.readyState === 1);
    
    connectedPlayers.forEach(({ ws, id }) => {
      if (WebSocketUtils.isWebSocketReady(ws)) {
        try {
          ws.send(json);
        } catch (e) {
          console.error(`Failed to send ${message.type} to player ${id} in room ${roomId}:`, e);
        }
      } else {
        console.warn(`Failed to send ${message.type} to player ${id} in room ${roomId}: WebSocket not open, readyState=${ws?.readyState}`);
      }
    });
  }

  /**
   * Send message to a specific player
   */
  sendToPlayer(roomId, playerId, message) {
    const room = this.stateManager.getRoom(roomId);
    if (!room) return false;

    const player = room.players.find(p => p.id === playerId);
    if (!player || !WebSocketUtils.isWebSocketReady(player.ws)) {
      return false;
    }

    try {
      player.ws.send(JSON.stringify(message));
      return true;
    } catch (e) {
      console.error(`Failed to send ${message.type} to player ${playerId} in room ${roomId}:`, e);
      return false;
    }
  }

  /**
   * End game and report results
   */
  async endGame(room, roomId) {
    // ⭐ CRITICAL FIX: Check if ball exists before accessing its properties
    if (!room.ball) {
      console.warn(`Cannot end game for room ${roomId}: ball has been disposed`);
      return;
    }
    
    if (room.ball.player1.playerScore >= GAME_CONFIG.WINNING_SCORE || room.ball.player2.playerScore >= GAME_CONFIG.WINNING_SCORE) {
      room.isGameOver = true;
      
      const matchData = await this._createMatchData(room, roomId);
      
      // ⭐ CRITICAL FIX: Handle case where match data creation fails
      if (!matchData) {
        console.warn(`Cannot end game for room ${roomId}: failed to create match data`);
        return;
      }
      
      this._logMatchCompletion(matchData);
      
      // Check if this is a tournament match and handle advancement
      if (room.matchType === 'tournament') {
        await this._handleTournamentMatchEnd(room, roomId, matchData);
      } else {
        // ⭐ FIX: Dispose ball assets for 1v1 games to prevent memory leaks
        await this._disposeBallAssets(room, roomId);
        
        // Report to external services (async, don't wait for completion)
        reportMatchResultsToAPI(matchData).catch(err => {
          console.error('Failed to report match results to external services:', err.message);
        });
        
        // Send game end message to players
        console.log(`🎮 Regular game ended in room ${roomId}, sending standard gameEnd message`);
        this.broadcastToRoom(roomId, {
          type: 'gameEnd',
          ...matchData
        });
      }
    }
  }

  /**
   * Create or join a room for a player
   */
  async createOrJoinRoom(playerId, player, ws) {
    const result = roomMatchmaker.findOrCreateRoom(player);
    await this.checkRoomReady(result.roomId);
    return result.roomId;
  }

  // Private helper methods
  async _startGame(room, roomId) {
    console.log(`🎮 Starting game for room ${roomId}`);
    room.setReady();
    console.log(`🎮 Room ${roomId} set ready, gameStarted: ${room.gameStarted}`);
    
    // ⭐ NEW: Reset ball spawn trigger for new game
    gameStateManager.resetBallSpawnTrigger(roomId);
    
    // Set player states to LAUNCH_ANIMATION when game starts
    room.players.forEach((p, i) => {
      const otherPlayer = room.players[1 - i];
      if (p.ws && p.ws.readyState === 1) {
        try {
          p.ws.send(JSON.stringify({
            type: 'init',
            playerId: p.id,
            roomId,
            role: i,
            opponentId: otherPlayer.id,
            playerName: p.username || 'Anonymous',
            opponentName: otherPlayer.username || 'Anonymous',
            // ⭐ FIX: Include initial paddle positions to ensure synchronization
            playerPositionZ: p.positionZ || 0,
            opponentPositionZ: otherPlayer.positionZ || 0
          }));
          console.log(`🎮 Sent game init to ${p.username}(${p.id}) in room ${roomId}`);
        } catch (error) {
          console.error(`❌ Error sending game init to player ${p.id}:`, error);
        }
      }
    });

    // Initialize ball for the room
    room.initializeBall();
    console.log(`🎮 Ball initialized for room ${roomId}`);

    // ⭐ FIX: Reset ball update flags to allow ball spawning after animation
    room.ballUpdateSent = false;
    room.ballUpdateTimeout = null;
    
    // Initialize animation status for the room
    gameStateManager.initializeAnimationStatus(roomId);
    console.log(`🎮 Animation status initialized for room ${roomId}`);

    // Set player states to LAUNCH_ANIMATION using disconnect handler
    console.log(`🎮 About to set player states to LAUNCH_ANIMATION for room ${roomId}`);
    await this._setPlayerStatesToLaunchAnimation(room, roomId);
    console.log(`🎮 Finished setting player states to LAUNCH_ANIMATION for room ${roomId}`);
  }

  /**
   * Set player states to LAUNCH_ANIMATION using disconnect handler
   */
  async _setPlayerStatesToLaunchAnimation(room, roomId) {
    console.log(`🎮 Setting player states to LAUNCH_ANIMATION for room ${roomId}`);
    
    try {
      const { disconnectionDetector } = await import('../server/disconnect/DisconnectionDetector.js');
      const matchType = room.matchType || '1v1';
      const handler = disconnectionDetector.getHandler(matchType, roomId);
      
      // Set player states to LAUNCH_ANIMATION
      room.players.forEach((player, index) => {
        console.log(`🎮 Setting player ${player.id} (${player.username}) to LAUNCH_ANIMATION state`);
        handler.setPlayerState(player.id, roomId, PlayerStates.LAUNCH_ANIMATION);
      });
      
      console.log(`✅ Successfully set all players to LAUNCH_ANIMATION state in room ${roomId}`);
    } catch (error) {
      console.error(`❌ Error setting player states to LAUNCH_ANIMATION for room ${roomId}:`, error);
    }
  }

  _notifyWaitingStatus(room) {
    room.players.forEach((p, index) => {
      if (p.ws && p.ws.readyState === 1) {
        const message = createWaitingMessage(room, p, index);
        p.ws.send(JSON.stringify(message));
      }
    });
  }

  _initializeBall(room) {
    // ⭐ CRITICAL FIX: Prevent ball recreation if it has been disposed
    if (room.ballDisposed) {
      console.warn(`Cannot initialize ball for room ${room.id}: ball has been disposed and cannot be recreated`);
      return;
    }
    
    console.error(`Ball not initialized for room, creating new`);
    room.ball = new Ball(
      { playerId: room.players[0].id, playerScore: 0, username: room.players[0].username || 'Player 1' },
      { playerId: room.players[1].id, playerScore: 0, username: room.players[1].username || 'Player 2' },
      this,
      room.id
    );
    room.ball.position = new BABYLON.Vector3(0, -2, 0);
    room.ball.velocity = new BABYLON.Vector3(0, 0, 0);
    room.ball.previousVelocity = new BABYLON.Vector3(0, 0, 0);
    room.ball.isRespawning = true;
    room.ball.respawnTime = 0;
    room.ball.hasValidPosition = true;
    
    // Set ball context for sound events
    if (room.setBallContext) {
      room.setBallContext(this);
    }
  }

  _ensureBallRespawnState(room) {
    // ⭐ CRITICAL FIX: Prevent ball state changes if it has been disposed
    if (room.ballDisposed) {
      console.warn(`Cannot ensure ball respawn state for room ${room.id}: ball has been disposed`);
      return;
    }
    
    if (!room.ballUpdateSent) {
      room.ball.position = new BABYLON.Vector3(0, -2, 0);
      room.ball.velocity = new BABYLON.Vector3(0, 0, 0);
      room.ball.previousVelocity = new BABYLON.Vector3(0, 0, 0);
      room.ball.isRespawning = true;
      room.ball.respawnTime = 0;
      room.ball.hasValidPosition = true;
    }
  }

  _createBallState(ball) {
    return {
      position: { x: ball.position.x, y: ball.position.y, z: ball.position.z },
      velocity: { x: ball.velocity.x, y: ball.velocity.y, z: ball.velocity.z },
      previousVelocity: { x: ball.previousVelocity.x, y: ball.previousVelocity.y, z: ball.previousVelocity.z },
      rebounds: ball.rebounds,
      isRespawning: ball.isRespawning,
      respawnTime: ball.respawnTime,
      wasHitByPlayer: ball.wasHitByPlayer,
      speed: ball.speed,
      hasValidPosition: true,
      currentGlowColor: ball.currentGlowColor ? 
        { r: ball.currentGlowColor.r, g: ball.currentGlowColor.g, b: ball.currentGlowColor.b } :
        { r: 0, g: 0, b: 0 },
      shouldGlow: ball.shouldGlow || false
    };
  }

  /**
   * Handle tournament match end and advancement
   */
  async _handleTournamentMatchEnd(room, roomId, matchData) {
    console.log(`🏆 Tournament match ended in room ${roomId}`);
    
    // Import tournament manager dynamically to avoid circular dependencies
    const { tournamentManager } = await import('../tournament/TournamentManager.js');
    
    // Get the waiting room ID from the tournament room metadata
    const waitingRoomId = room.metadata?.waitingRoomId;
    if (!waitingRoomId) {
      console.error(`🏆 No waiting room ID found for tournament room ${roomId}`);
      return;
    }
    
    // Handle tournament advancement based on room type
    const roomType = room.metadata?.roomType;
    if (roomType === 'semi_final_a' || roomType === 'semi_final_b') {
      await tournamentManager.handleSemiFinalMatchEnd(waitingRoomId, roomId, matchData);
    } else if (roomType === 'winner_final' || roomType === 'loser_final') {
      await tournamentManager.handleFinalMatchEnd(waitingRoomId, roomId, matchData);
    } else {
      console.error(`🏆 Unknown tournament room type: ${roomType}`);
    }
  }

  async _createMatchData(room, roomId) {
    const player1 = room.players[0];
    const player2 = room.players[1];
    
    // ⭐ CRITICAL FIX: Check if ball exists before accessing its properties
    if (!room.ball) {
      console.warn(`Cannot create match data for room ${roomId}: ball has been disposed`);
      return null;
    }
    
    const score1 = room.ball.player1.playerScore;
    const score2 = room.ball.player2.playerScore;
    
    const winner = score1 >= GAME_CONFIG.WINNING_SCORE ? player1 : player2;
    const loser = score1 >= GAME_CONFIG.WINNING_SCORE ? player2 : player1;
    const winnerScore = score1 >= GAME_CONFIG.WINNING_SCORE ? score1 : score2;
    const loserScore = score1 >= GAME_CONFIG.WINNING_SCORE ? score2 : score1;
    
    const matchEndTime = new Date().toISOString();
    const matchStartTime = room.startTime || new Date().toISOString();
    
    // Generate match ID for blockchain reporting
    let matchId = null;
    try {
      const { blockchainService } = await import('../services/blockchainService.js');
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Match ID generation timeout')), 3000)
      );
      matchId = await Promise.race([
        blockchainService.generateMatchId(),
        timeoutPromise
      ]);
      console.log(`🎯 Generated match ID ${matchId} for room ${roomId}`);
    } catch (error) {
      console.error('❌ Failed to generate match ID:', error.message);
      // Use timestamp as fallback ID
      matchId = Math.floor(Date.now() / 1000) % 1000000;
      console.log(`🎯 Using fallback match ID ${matchId} for room ${roomId}`);
    }
    
    return {
      roomId,
      matchId, // Add the generated match ID
      matchStartTime,
      matchEndTime,
      matchDuration: new Date() - new Date(matchStartTime),
      matchType: 'regular',
      finalMatchType: null,
      winner: {
        id: winner.id,
        userId: winner.userId, // Include real user ID for blockchain operations
        username: winner.username || 'Anonymous',
        score: winnerScore
      },
      loser: {
        id: loser.id,
        userId: loser.userId, // Include real user ID for blockchain operations
        username: loser.username || 'Anonymous',
        score: loserScore
      },
      gameStats: {
        totalRebounds: room.ball.rebounds,
        finalScore: `${winnerScore}-${loserScore}`,
        scoreHistory: room.scoreHistory || [],
        ballSpeed: room.ball.speed,
        lastHitBy: room.ball.wasHitByPlayer,
        matchType: 'regular',
        finalMatchType: null
      },
      serverTime: Date.now(),
    };
  }

  _logMatchCompletion(matchData) {
    console.log('='.repeat(60));
    console.log('MATCH COMPLETED');
    console.log('='.repeat(60));
    console.log(`Room ID: ${matchData.roomId}`);
    console.log(`Match End Time: ${matchData.matchEndTime}`);
    console.log(`Winner: ${matchData.winner.username} (ID: ${matchData.winner.id}) - Score: ${matchData.winner.score}`);
    console.log(`Loser: ${matchData.loser.username} (ID: ${matchData.loser.id}) - Score: ${matchData.loser.score}`);
    console.log(`Final Score: ${matchData.winner.score}-${matchData.loser.score}`);
    console.log(`Total Ball Rebounds: ${matchData.gameStats.totalRebounds}`);
    console.log(`Match Duration: ${matchData.matchDuration}ms`);
    console.log('='.repeat(60));
  }

  async _attemptBallUpdate(roomId, attempt = 1) {
    const room = this.stateManager.getRoom(roomId);
    if (!room || room.ballUpdateSent || attempt > 5) return;

    console.log(`Attempting ball update for room ${roomId}, attempt ${attempt}`);
    
    // ⭐ FIX: Check if both players have completed animation before sending ball update
    const animationStatus = gameStateManager.getAnimationStatusForRoom(roomId);
    const animationCompleteCount = animationStatus.length;
    
    if (room.players.length === 2 && animationCompleteCount >= 2) {
      // Both players have completed animation - send ball update
      console.log(`🎮 Both players completed animation in room ${roomId}, sending ball update`);
      await this.sendBallUpdateForced(roomId);
    } else if (room.players.length === 2 && animationCompleteCount < 2) {
      // Wait for animation completion
      console.log(`🎮 Waiting for animation completion in room ${roomId} (${animationCompleteCount}/2 players ready)`);
      setTimeout(() => this._attemptBallUpdate(roomId, attempt + 1), 100 * attempt);
    } else {
      // Not enough players or other conditions
      setTimeout(() => this._attemptBallUpdate(roomId, attempt + 1), 100 * attempt);
    }
  }

  _generateRoomId() {
    // Simple room ID generation - could be enhanced
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * ⭐ FIX: Dispose ball assets to prevent memory leaks in 1v1 games
   */
  async _disposeBallAssets(room, roomId) {
    console.log(`🧹 1v1: Disposing ball assets for room ${roomId}`);
    
    if (room.ball) {
      // Stop ball movement by setting velocity to zero
      if (room.ball.velocity) {
        room.ball.velocity.set(0, 0, 0);
        console.log(`🧹 1v1: Ball velocity set to zero for room ${roomId}`);
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
      
      // ⭐ CRITICAL: Nullify the ball object to stop all movement
      room.ball = null;
      
      console.log(`🧹 1v1: Ball object nullified for room ${roomId}`);
    }
    
    // ⭐ FIX: Set flag to prevent ball recreation
    room.ballDisposed = true;
    console.log(`🧹 1v1: Ball disposal flag set for room ${roomId}`);
    
    // ⭐ FIX: Send final sync message with ballState: null to explicitly stop client processing
    try {
      this.broadcastToRoom(roomId, {
        type: 'sync',
        playerPositions: {},
        ballState: null,
        serverTime: Date.now(),
        roomId: roomId,
        isDelta: true,
        ballDisposed: true // ⭐ NEW: Flag to indicate ball has been disposed
      });
      console.log(`🧹 1v1: Sent final sync message with ballState: null for room ${roomId}`);
    } catch (error) {
      console.error(`🧹 1v1: Error sending final sync message for room ${roomId}:`, error);
    }
    
    // Clear ball update flags
    room.ballUpdateSent = false;
    if (room.ballUpdateTimeout) {
      clearTimeout(room.ballUpdateTimeout);
      room.ballUpdateTimeout = null;
      console.log(`🧹 1v1: Ball update timeout cleared for room ${roomId}`);
    }
    
    console.log(`🧹 1v1: Ball assets disposal completed for room ${roomId}`);
  }
}

// Create singleton instance
export const gameEngine = new GameEngine(); 