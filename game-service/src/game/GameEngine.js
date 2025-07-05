import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import { reportMatchResultsToAPI } from '../server/api.js';
import { gameStateManager } from './GameStateManager.js';
import {  WebSocketUtils } from '../utils/helpers.js';
import { roomMatchmaker } from '../room/RoomMatchmaker.js';
import { createWaitingMessage } from '../player/playerStatus.js';

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
  checkRoomReady(roomId) {
    const room = this.stateManager.getRoom(roomId);
    if (!room || room.ready) return;

    if (room.isReadyForGame()) {
      this._startGame(room, roomId);
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
  sendBallUpdateForced(roomId) {
    const room = this.stateManager.getRoom(roomId);
    if (!room || room.players.length !== 2) {
      console.warn(`Cannot send forced ballUpdate for room ${roomId}: invalid state`, {
        exists: !!room,
        playerCount: room?.players.length
      });
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
    
    // Filter out disconnected players
    room.players = room.players.filter(p => p.ws && p.ws.readyState === 1);
    
    room.players.forEach(({ ws, id }) => {
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
    if (room.ball.player1.playerScore >= 11 || room.ball.player2.playerScore >= 11) {
      room.isGameOver = true;
      
      const matchData = this._createMatchData(room, roomId);
      this._logMatchCompletion(matchData);
      
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

  /**
   * Create or join a room for a player
   */
  createOrJoinRoom(playerId, player, ws) {
    const result = roomMatchmaker.findOrCreateRoom(player);
    this.checkRoomReady(result.roomId);
    return result.roomId;
  }

  // Private helper methods
  _startGame(room, roomId) {
    room.setReady();
    
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
          }));
          console.log(`Sent init to player ${p.id} (${p.username}) in room ${roomId}`);
        } catch (e) {
          console.error(`Failed to send init to player ${p.id}:`, e);
        }
      }
    });

    // Initialize animation status
    this.stateManager.initializeAnimationStatus(roomId);
    
    // Set player states to LAUNCH_ANIMATION
    room.players.forEach(p => {
      if (room.metadata && room.metadata.playerStates) {
        room.metadata.playerStates[p.id] = {
          state: 'launch_animation',
          timestamp: Date.now(),
          previousState: room.metadata.playerStates[p.id]?.state || 'waiting'
        };
      }
    });
    
    // ⭐ ANIMATION FIX: Do NOT send the ball update here.
    // The ball update will be triggered by MessageRouter._handleAnimationComplete
    // after both clients have confirmed their intro animations are done.
    console.log(`Game started for room ${roomId}. Waiting for clients to complete animations.`);
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

  _createMatchData(room, roomId) {
    const player1 = room.players[0];
    const player2 = room.players[1];
    const score1 = room.ball.player1.playerScore;
    const score2 = room.ball.player2.playerScore;
    
    const winner = score1 >= 11 ? player1 : player2;
    const loser = score1 >= 11 ? player2 : player1;
    const winnerScore = score1 >= 11 ? score1 : score2;
    const loserScore = score1 >= 11 ? score2 : score1;
    
    const matchEndTime = new Date().toISOString();
    const matchStartTime = room.startTime || new Date().toISOString();
    
    return {
      roomId,
      matchStartTime,
      matchEndTime,
      matchDuration: new Date() - new Date(matchStartTime),
      matchType: 'regular',
      finalMatchType: null,
      winner: {
        id: winner.id,
        username: winner.username || 'Anonymous',
        score: winnerScore
      },
      loser: {
        id: loser.id,
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

  _attemptBallUpdate(roomId, attempt = 1) {
    const room = this.stateManager.getRoom(roomId);
    if (!room || room.ballUpdateSent || attempt > 5) return;

    console.log(`Attempting ball update for room ${roomId}, attempt ${attempt}`);
    if (room.players.length === 2) {
      // Regular 1v1 room - immediate ball update (will wait for animationComplete)
      this.sendBallUpdateForced(roomId);
    } else {
      setTimeout(() => this._attemptBallUpdate(roomId, attempt + 1), 100 * attempt);
    }
  }

  _generateRoomId() {
    // Simple room ID generation - could be enhanced
    return Math.random().toString(36).substring(2, 15);
  }
}

// Create singleton instance
export const gameEngine = new GameEngine(); 