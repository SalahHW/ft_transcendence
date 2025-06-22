import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import { gameStateManager } from '../game/GameStateManager.js';
import { gameEngine } from '../game/GameEngine.js';
import { MESSAGE_TYPES } from '../core/constants.js';
import { ValidationUtils, PositionUtils } from '../utils/helpers.js';
import { playerManager } from '../player/PlayerManager.js';
import { playerInput } from '../player/PlayerInput.js';

/**
 * Routes WebSocket messages to appropriate handlers
 */
export class MessageRouter {
  constructor() {
    this.messageHandlers = new Map();
    this._setupMessageHandlers();
  }

  /**
   * Setup message type handlers
   */
  _setupMessageHandlers() {
    this.messageHandlers.set(MESSAGE_TYPES.ANIMATION_COMPLETE, this._handleAnimationComplete.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.SET_USERNAME, this._handleSetUsername.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.KEY_DOWN, this._handleKeyDown.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.KEY_UP, this._handleKeyUp.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.PADDLE_POSITION, this._handlePaddlePosition.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.LEAVE_GAME, this._handleLeaveGame.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.REQUEST_BALL_RESPAWN, this._handleBallRespawn.bind(this));
  }

  /**
   * Route a message to the appropriate handler
   */
  routeMessage(data, playerId, roomId, ws, disconnectHandler) {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      console.error('Bad JSON:', e);
      return;
    }

    const handler = this.messageHandlers.get(msg.type);
    if (handler) {
      handler(msg, playerId, roomId, ws, disconnectHandler);
    } else {
      console.warn(`Unknown message type: ${msg.type}`);
    }
  }

  /**
   * Handle animation completion
   */
  _handleAnimationComplete(msg, playerId, roomId) {
    const statusSize = gameStateManager.addPlayerToAnimationStatus(roomId, playerId);
    const room = gameStateManager.getRoom(roomId);
    
    if (statusSize === 2 && room?.ready) {
      console.log(`Both players completed animations in room ${roomId}, scheduling ballUpdate after splash screen delay`);
      
      // 🎬 Add delay to ensure splash screen completes on both clients
      // The splash screen shows for 3000ms, so we add a small buffer
      setTimeout(() => {
        // Double-check that room still exists and is valid
        const roomCheck = gameStateManager.getRoom(roomId);
        if (roomCheck && roomCheck.ready && !roomCheck.ballUpdateSent) {
          console.log(`Sending ballUpdate for room ${roomId} after splash screen delay`);
          gameEngine.sendBallUpdateForced(roomId);
        } else {
          console.log(`Skipping ballUpdate for room ${roomId} - room state changed or ball already sent`);
        }
      }, 3500); // 3000ms splash screen + 500ms buffer
    }
  }

  /**
   * Handle username setting
   */
  _handleSetUsername(msg, playerId, roomId, ws) {
    const providedPlayerId = msg.playerId || playerId;
    if (providedPlayerId !== playerId) {
      this._sendError(ws, 'Invalid playerId');
      return;
    }

    try {
      const player = playerManager.getPlayer(playerId);
      if (!player) {
        this._sendError(ws, 'Player not found');
        return;
      }

      if (player.username) {
        console.log(`Player ${playerId} already has username ${player.username} from API`);
        player.setReady();
        gameEngine.broadcastToRoom(roomId, {
          type: 'usernameUpdate',
          playerId,
          username: player.username,
        });
        gameEngine.checkRoomReady(roomId);
        return;
      }

      const username = msg.username?.trim();
      playerManager.setPlayerUsername(playerId, username);
      
      gameEngine.broadcastToRoom(roomId, {
        type: 'usernameUpdate',
        playerId,
        username,
      });
      gameEngine.checkRoomReady(roomId);
    } catch (error) {
      this._sendError(ws, error.message);
    }
  }

  /**
   * Handle key down events
   */
  _handleKeyDown(msg, playerId) {
    return playerInput.processKeyDown(playerId, msg.direction);
  }

  /**
   * Handle key up events
   */
  _handleKeyUp(msg, playerId) {
    return playerInput.processKeyUp(playerId, msg.direction);
  }

  /**
   * Handle paddle position updates
   */
  _handlePaddlePosition(msg, playerId) {
    return playerInput.processPaddlePosition(playerId, msg.positionZ);
  }

  /**
   * Handle player leaving game
   */
  _handleLeaveGame(msg, playerId, roomId, ws, disconnectHandler) {
    console.log(`🏃 Player ${playerId} is leaving the game in room ${roomId}`);
    playerManager.markPlayerLeaving(playerId);
    disconnectHandler(playerId, roomId);
  }

  /**
   * Handle ball respawn requests
   */
  _handleBallRespawn(msg, playerId, roomId) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) return;

    if (!room.ball) {
      room.ball = new Ball(
        { playerId: room.players[0]?.id || playerId, playerScore: 0, username: room.players[0]?.username || 'Player 1' },
        { playerId: room.players[1]?.id || playerId, playerScore: 0, username: room.players[1]?.username || 'Player 2' },
        gameEngine,
        roomId
      );
    }

    if (msg.isInitial) {
      room.ball.position = new BABYLON.Vector3(0, -2, 0);
      room.ball.isRespawning = true;
      room.ball.respawnTime = 0;
      room.ball.hasValidPosition = true;
    } else {
      room.ball.init();
    }

    room.ball.isRespawning = true;
    const ballState = this._createBallState(room.ball);

    console.log(`Sending ballUpdate on requestBallRespawn at ${Date.now()}:`, ballState);
    gameEngine.broadcastToRoom(roomId, {
      type: 'ballUpdate',
      ballState,
      isInitialSpawn: msg.isInitial || false,
      isScoreRespawn: !msg.isInitial
    });
    
    room.ballUpdateSent = true;
  }

  /**
   * Create ball state object
   */
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
      currentGlowColor: ball.currentGlowColor ? 
        { r: ball.currentGlowColor.r, g: ball.currentGlowColor.g, b: ball.currentGlowColor.b } :
        { r: 0, g: 0, b: 0 },
      shouldGlow: ball.shouldGlow || false
    };
  }

  /**
   * Send error message to client
   */
  _sendError(ws, message) {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'error',
        message,
      }));
    }
  }
}

// Create singleton instance
export const messageRouter = new MessageRouter(); 