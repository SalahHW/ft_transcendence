import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import { gameStateManager } from '../game/GameStateManager.js';
import { gameEngine } from '../game/GameEngine.js';
import { MESSAGE_TYPES } from '../core/constants.js';
import { playerManager } from '../player/PlayerManager.js';
import { playerInput } from '../player/PlayerInput.js';
import { handlePlayerDisconnect, handleExplicitLeave, handlePlayerStateUpdate, handleBrowserEvent } from '../server/disconnect/index.js';
import { PlayerStates } from '../server/disconnect/BaseDisconnectHandler.js';
import { schemas, messageTypeSchema } from './schemas.js';

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
    this.messageHandlers.set(MESSAGE_TYPES.SET_USERNAME, this._handleSetUsername.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.KEY_DOWN, this._handleKeyDown.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.KEY_UP, this._handleKeyUp.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.PADDLE_POSITION, this._handlePaddlePosition.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.LEAVE_GAME, this._handleLeaveGame.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.REQUEST_BALL_RESPAWN, this._handleBallRespawn.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.ANIMATION_COMPLETE, this._handleAnimationComplete.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.KEEP_ALIVE, this._handleKeepAlive.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.UPDATE_PLAYER_STATE, this._handleUpdatePlayerState.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.BROWSER_EVENT, this._handleBrowserEvent.bind(this));
    this.messageHandlers.set('powerupActivation', this._handlePowerupActivation.bind(this));
    this.messageHandlers.set('leaveTournament', this._handleLeaveTournament.bind(this));
  }

  /**
   * Route a message to the appropriate handler
   */
  async routeMessage(data, playerId, roomId, ws) {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      console.error('Bad JSON:', e);
      return;
    }

    // Validate the message type and get the corresponding schema
    const typeValidation = messageTypeSchema.safeParse(msg);

    if (!typeValidation.success) {
      // Also check for 'powerupActivation' which might not be in MESSAGE_TYPES
      if (msg.type !== 'powerupActivation') {
        console.warn(`Unknown or invalid message type: ${msg.type}`, typeValidation.error.flatten());
        return;
      }
    }

    const schema = schemas[msg.type];

    if (!schema) {
      console.warn(`No validation schema found for message type: ${msg.type}. Blocking message.`);
      return;
    } else {
      const validation = schema.safeParse(msg);
      if (!validation.success) {
        console.error(`Invalid message structure for type ${msg.type}:`, validation.error.flatten());
        return; // Stop processing invalid message
      }
      // Use the validated data from now on
      msg = validation.data;
    }

    const handler = this.messageHandlers.get(msg.type);
    if (handler) {
      await handler(msg, playerId, roomId, ws);
    } else {
      console.warn(`Unknown message type: ${msg.type}`);
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
   * Handle player leaving game (explicit leave button only)
   */
  _handleLeaveGame(msg, playerId, roomId, ws) {
    // Handle explicit leave game button click
    return handleExplicitLeave(playerId, roomId);
  }

  /**
   * Handle animation complete messages
   */
  _handleAnimationComplete(msg, playerId, roomId) {
    // Add player to animation status
    const statusSize = gameStateManager.addPlayerToAnimationStatus(roomId, playerId);
    
    // Check if this is a tournament room
    const room = gameStateManager.getRoom(roomId);
    const isTournamentRoom = room && (room.matchType === 'tournament' || 
                                     room.metadata?.roomType?.includes('semi_final') ||
                                     room.metadata?.roomType?.includes('final'));
    
    const currentPlayers = gameStateManager.getAnimationStatusForRoom(roomId);
    console.log(`Animation: ${statusSize}/2 ready in ${isTournamentRoom ? 'tournament' : '1v1'} room ${roomId} - Players: [${currentPlayers.join(', ')}]`);
    
    // Debug: Check if this is the wrong room for tournament players
    if (isTournamentRoom && room.metadata?.roomType?.includes('semi_final')) {
      const expectedRoomId = roomId;
      console.log(`🏆 Player ${playerId} completed animation in semi-final room ${roomId}`);
    } else if (room && room.matchType === 'tournament' && room.metadata?.roomType === 'waiting') {
      console.log(`⚠️ WARNING: Player ${playerId} completed animation in WAITING room ${roomId} instead of semi-final room!`);
    }
    
    // ⭐ FIX: Trigger ball spawning when both players have completed animation
    if (statusSize >= 2 && room && room.players.length >= 2) {
      console.log(`🎮 Both players completed animation in room ${roomId}, triggering ball spawn`);
      
      // Import gameEngine dynamically to avoid circular dependencies
      import('../game/GameEngine.js').then(({ gameEngine }) => {
        // Send ball update to trigger spawning
        gameEngine.sendBallUpdateForced(roomId);
      }).catch(error => {
        console.error(`❌ Error importing gameEngine for ball spawn in room ${roomId}:`, error);
      });
    }
  }

  /**
   * Handle ball respawn requests
   */
  async _handleBallRespawn(msg, playerId, roomId) {
    const room = gameStateManager.getRoom(roomId);
    if (!room) {
      console.warn(`Ball respawn request from ${playerId}: room ${roomId} not found`);
      return;
    }

    // Check if we have enough players before proceeding
    if (room.players.length < 2) {
      console.warn(`Ball respawn request from ${playerId}: not enough players (${room.players.length}/2) in room ${roomId}`);
      return;
    }

    // Set player states to PLAYING when ball respawns
    try {
      const { disconnectionDetector } = await import('../server/disconnect/DisconnectionDetector.js');
      const matchType = room.matchType || '1v1';
      const handler = disconnectionDetector.getHandler(matchType, roomId);
      
      room.players.forEach((player, index) => {
        console.log(`🎮 Setting player ${player.id} (${player.username}) to PLAYING state during ball respawn`);
        handler.setPlayerState(player.id, roomId, PlayerStates.PLAYING);
      });
    } catch (error) {
      console.error(`❌ Error setting player states to PLAYING during ball respawn:`, error);
    }

    // Reset ball for respawn
    room.resetBall();
    
    // Send ball update to all players
    room.players.forEach((p, i) => {
      if (p.ws && p.ws.readyState === 1) {
        try {
          // ⭐ FIX: Send ballUpdate instead of ballRespawn to match client expectations
          const ballState = this._createBallState(room.ball);
          p.ws.send(JSON.stringify({
            type: 'ballUpdate',
            ballState: ballState,
            isInitialSpawn: msg.isInitial || false,
            isScoreRespawn: false
          }));
        } catch (error) {
          console.error(`❌ Error sending ball update to player ${p.id}:`, error);
        }
      }
    });
  }

  /**
   * Set player states to PLAYING using dynamic import to avoid circular dependencies
   */
  async _setPlayerStatesToPlaying(room, roomId) {
    try {
      const { disconnectionDetector } = await import('../server/disconnect/DisconnectionDetector.js');
      const matchType = room.matchType || '1v1';
      const handler = disconnectionDetector.getHandler(matchType, roomId);
      
      // Set both players to PLAYING state when ball spawns
      room.players.forEach(p => {
        handler.setPlayerState(p.id, roomId, PlayerStates.PLAYING);
      });
    } catch (error) {
      console.error('Error setting player states to playing:', error);
    }
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

  /**
   * ⭐ POWERUP INTEGRATION: Handle powerup activation requests
   */
  _handlePowerupActivation(msg, playerId, roomId) {
    try {
      const player = playerManager.getPlayer(playerId);
      const room = gameStateManager.getRoom(roomId);
      
      if (!player || !room) {
        return;
      }
      
      // Get current ball rebounds for speed tier check
      const ballRebounds = room.ball ? room.ball.rebounds : 0;
      
      // Attempt to activate powerup
      const success = player.activatePowerup(ballRebounds);
      
      // Broadcast powerup state update to all players in room
      const powerupStates = {};
      room.players.forEach(p => {
        const playerData = playerManager.getPlayer(p.id);
        if (playerData && playerData.powerup) {
          powerupStates[p.id] = playerData.getPowerupState();
        }
      });
      
      gameEngine.broadcastToRoom(roomId, {
        type: 'powerupStateUpdate',
        powerupStates: powerupStates,
        activationAttempt: {
          playerId: playerId,
          success: success,
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      console.error('❌ Error handling powerup activation:', error);
    }
  }

  /**
   * Handle keep-alive ping messages (disabled - only explicit leave button)
   */
  _handleKeepAlive(msg, playerId, roomId, ws) {
    const room = gameStateManager.getRoom(roomId);
    
    if (!room) {
      console.log(`🏆 Keep-alive ping from ${playerId}: room ${roomId} no longer exists (tournament likely ended)`);
      // Send a response to inform the client that the room no longer exists
      if (ws && ws.readyState === 1) {
        try {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Tournament has ended. Please refresh the page to join a new game.'
          }));
          // Close the connection after sending the error message
          ws.close(1000, 'Tournament ended');
        } catch (error) {
          console.error(`Failed to send error message to ${playerId}:`, error);
        }
      }
      return;
    }
    
    console.log(`🏆 Keep-alive ping ignored from ${playerId}: ${msg.reason || 'no reason specified'}`);
    // Disabled - only explicit leave button handling
  }

  /**
   * Handle player state updates from browser
   */
  _handleUpdatePlayerState(msg, playerId, roomId, ws) {
    console.log(`🔄 Player state update from ${playerId}: ${msg.state} in room ${roomId}`);
    handlePlayerStateUpdate(playerId, roomId, msg.state);
  }

  /**
   * Handle browser events from client
   */
  _handleBrowserEvent(msg, playerId, roomId, ws) {
    console.log(`🌐 Browser event from ${playerId}: ${msg.eventType} in room ${roomId}`);
    handleBrowserEvent(playerId, roomId, msg.eventType);
  }

  /**
   * Handle tournament leave requests
   */
  _handleLeaveTournament(msg, playerId, roomId, ws) {
    console.log(`🏆 Tournament leave request from player ${playerId} in room ${roomId}`);
    
    // Import tournament manager here to avoid circular dependencies
    import('../tournament/TournamentManager.js').then(({ tournamentManager }) => {
      tournamentManager.handlePlayerLeave(playerId, roomId);
    }).catch(error => {
      console.error('Failed to import tournament manager:', error);
    });
  }
}

// Create singleton instance
export const messageRouter = new MessageRouter(); 