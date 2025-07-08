import * as BABYLON from '@babylonjs/core';
import { getGameState, broadcastToRoom, endGame } from './gameState.js';
import { GAME_CONFIG } from '../core/constants.js';
import { RoomUtils } from '../utils/helpers.js';
import { gameStateManager } from '../game/GameStateManager.js';
import { gameEngine } from '../game/GameEngine.js';
import { playerManager } from '../player/PlayerManager.js';

export function startGameLoop() {
  const FPS = GAME_CONFIG.FPS;
  const BROADCAST_FPS = GAME_CONFIG.BROADCAST_FPS;
  const SYNC_INTERVAL = GAME_CONFIG.SYNC_INTERVAL;
  let lastBroadcast = Date.now();
  let lastSync = Date.now();
  let frameCount = 0;
  let lastFrameTime = Date.now();

  // Track previous states for delta compression
  const previousStates = new Map();

  const { gameRooms } = gameStateManager.getGameState();

  const update = () => {
    const now = Date.now();
    const deltaTime = 1 / FPS;
    frameCount++;
    if (now - lastFrameTime >= 1000) {
      frameCount = 0;
      lastFrameTime = now;
    }

    try {
      gameRooms.forEach((room, roomId) => {
        if (!RoomUtils.isRoomReadyForGame(room)) return;

        // ⭐ CRITICAL FIX: Skip rooms that have disposed balls to prevent any ball processing
        if (room.ballDisposed) {
          console.log(`🏆 Skipping game loop processing for room ${roomId}: ball has been disposed`);
          
          // ⭐ CRITICAL FIX: Clear previous ball state to prevent any ball state from being sent
          const prevState = previousStates.get(roomId);
          if (prevState && prevState.ballState) {
            console.log(`🏆 Clearing previous ball state for room ${roomId} due to disposal`);
            previousStates.set(roomId, {
              ...prevState,
              ballState: null
            });
          }
          
          return;
        }

        // ⭐ CRITICAL FIX: Check if room is in animation phase and skip ball updates
        const animationStatus = gameStateManager.getAnimationStatusForRoom(roomId);
        const isInAnimationPhase = animationStatus.length < 2; // Less than 2 players completed animation
        
        if (isInAnimationPhase) {
          // Skip ball processing during animation phase to prevent state corruption
          // Only process player movements during animation
          const changedPlayerPositions = {};
          room.players.forEach((player, index) => {
            if (player.ws && player.ws.readyState === 1) {
              // Process player input during animation (for visual feedback)
              if (player.inputState) {
                const moveDirection = player.inputState.up ? -1 : player.inputState.down ? 1 : 0;
                if (moveDirection !== 0) {
                  const newPosition = player.positionZ + (moveDirection * GAME_CONFIG.PADDLE_SPEED * deltaTime);
                  player.positionZ = Math.max(-GAME_CONFIG.PADDLE_BOUNDARY, Math.min(GAME_CONFIG.PADDLE_BOUNDARY, newPosition));
                  changedPlayerPositions[player.id] = player.positionZ;
                }
              }
            }
          });
          
          // Skip ball updates during animation phase
          return;
        }

        room.players.forEach((player, index) => {
          // ✅ SERVER-SIDE: IDENTICAL FOR ALL ROOM TYPES (1v1, semi-finals, finals)
          // All game modes use the same paddle speed calculation and deltaTime
          const speed = GAME_CONFIG.PADDLE_SPEED;
          const halfD = GAME_CONFIG.PADDLE_BOUNDARY;
          let moved = false;
          if (player.isUpPressed && !player.isDownPressed) {
            const newZ = player.positionZ - speed * deltaTime;
            player.positionZ = Math.max(-halfD, newZ);
            moved = newZ !== player.positionZ;
          } else if (player.isDownPressed && !player.isUpPressed) {
            const newZ = player.positionZ + speed * deltaTime;
            player.positionZ = Math.min(halfD, newZ);
            moved = newZ !== player.positionZ;
          }
          player.positionZ = Number(player.positionZ.toFixed(3));

          const playerData = playerManager.getPlayer(player.id);
          if (playerData && playerData.powerup) {
            const ballRebounds = room.ball ? room.ball.rebounds : 0;
            playerData.update(deltaTime, ballRebounds);
          }

          // ✅ SERVER-SIDE: BROADCAST THROTTLING IS IDENTICAL FOR ALL ROOM TYPES
          // The server sends paddle updates at the same rate regardless of room type
          if ((player.isUpPressed || player.isDownPressed) && now - lastBroadcast >= 1000 / BROADCAST_FPS) {
            gameEngine.broadcastToRoom(roomId, {
              type: 'paddleMove',
              playerId: player.id,
              positionZ: player.positionZ,
              roomId: roomId
            });
          }
        });

        if (now - lastBroadcast >= 1000 / BROADCAST_FPS) {
          const powerupStates = {};
          let hasPowerupUpdates = false;
          
          room.players.forEach(player => {
            const playerData = playerManager.getPlayer(player.id);
            if (playerData && playerData.powerup) {
              powerupStates[player.id] = playerData.getPowerupState();
              hasPowerupUpdates = true;
            }
          });
          
          if (hasPowerupUpdates) {
            gameEngine.broadcastToRoom(roomId, {
              type: 'powerupStateUpdate',
              powerupStates: powerupStates
            });
          }
        }

        if (room.ball) {
          // Ensure ball has sound context (for existing balls)
          if (!room.ball.gameEngine || !room.ball.roomId) {
            room.ball.gameEngine = gameEngine;
            room.ball.roomId = roomId;
          }
          
          const paddle1Pos = new BABYLON.Vector3(19.5, 2, room.players[0].positionZ);
          const paddle2Pos = new BABYLON.Vector3(-19.5, 2, room.players[1].positionZ);
          const prevScore1 = room.ball.player1.playerScore;
          const prevScore2 = room.ball.player2.playerScore;
          

          
          // Handle ball state
          if (room.ball.isRespawning) {
            room.ball.respawnTime += deltaTime;
            const t = Math.min(room.ball.respawnTime / GAME_CONFIG.BALL_RESPAWN_DURATION, 1);  // Respawn animation
            
            // Smoothly interpolate position
            room.ball.position = new BABYLON.Vector3(
              0,
              -2 + (3 * t),  // Animate from y=-2 to y=1
              0
            );

            // Send updates more frequently during respawn
            if (now - lastBroadcast >= (1000 / (BROADCAST_FPS * 2))) {  // Double the update rate during respawn
              const ballState = {
                position: { x: room.ball.position.x, y: room.ball.position.y, z: room.ball.position.z },
                velocity: { x: room.ball.velocity.x, y: room.ball.velocity.y, z: room.ball.velocity.z },
                previousVelocity: { x: room.ball.previousVelocity.x, y: room.ball.previousVelocity.y, z: room.ball.previousVelocity.z },
                rebounds: room.ball.rebounds,
                isRespawning: true,
                respawnTime: room.ball.respawnTime,
                wasHitByPlayer: room.ball.wasHitByPlayer,
                speed: room.ball.speed,
                hasValidPosition: true,
                currentGlowColor: { r: room.ball.currentGlowColor.r, g: room.ball.currentGlowColor.g, b: room.ball.currentGlowColor.b },
                shouldGlow: room.ball.shouldGlow
              };

              gameEngine.broadcastToRoom(roomId, {
                type: 'ballUpdate',
                ballState,
                isInitialSpawn: false,
                isScoreRespawn: false,
                roomId: roomId
              });
            }

            if (t >= 1) {
              room.ball.isRespawning = false;
              room.ball.position.y = 1;
              room.ball.velocity.copyFrom(room.ball.previousVelocity);
              if (room.ball.velocity.length() === 0) {
                room.ball.setFirstVelocity();
              }
              room.ball.hasValidPosition = true;
              room.ball.handleAcceleration();
            }
          }

          // Update ball position if not respawning
          if (!room.ball.isRespawning) {
            room.ball.update(deltaTime, paddle1Pos, paddle2Pos);
          }

          // Send ball updates
          if (now - lastBroadcast >= 1000 / BROADCAST_FPS) {
            const ballState = room.ball ? {
              position: { x: room.ball.position.x, y: room.ball.position.y, z: room.ball.position.z },
              velocity: { x: room.ball.velocity.x, y: room.ball.velocity.y, z: room.ball.velocity.z },
              previousVelocity: { x: room.ball.previousVelocity.x, y: room.ball.previousVelocity.y, z: room.ball.previousVelocity.z },
              rebounds: room.ball.rebounds,
              isRespawning: room.ball.isRespawning,
              respawnTime: room.ball.respawnTime,
              wasHitByPlayer: room.ball.wasHitByPlayer,
              speed: room.ball.speed,
              currentGlowColor: { r: room.ball.currentGlowColor.r, g: room.ball.currentGlowColor.g, b: room.ball.currentGlowColor.b },
              shouldGlow: room.ball.shouldGlow
            } : null;
            gameEngine.broadcastToRoom(roomId, {
              type: 'ballUpdate',
              ballState,
              isInitialSpawn: false,
              isScoreRespawn: false,
              roomId: roomId
            });
          }

          // ⭐ CRITICAL FIX: Check if room.ball exists before accessing its properties
          if (room.ball && room.ball.player1 && room.ball.player2) {
            if (room.ball.player1.playerScore !== prevScore1 || room.ball.player2.playerScore !== prevScore2) {
              // Use the ball's player objects directly for accurate mapping
              const ballPlayer1Name = room.ball.player1.username || 'Player 1';
              const ballPlayer2Name = room.ball.player2.username || 'Player 2';
              
              if (room.ball.player1.playerScore > prevScore1) {
                console.log(`💥 ${ballPlayer1Name} scored! ${ballPlayer2Name} lost a point!`);
                console.log(`🏓 Current Score: ${ballPlayer1Name}: ${room.ball.player1.playerScore} - ${ballPlayer2Name}: ${room.ball.player2.playerScore}`);
              }
              if (room.ball.player2.playerScore > prevScore2) {
                console.log(`💥 ${ballPlayer2Name} scored! ${ballPlayer1Name} lost a point!`);
                console.log(`🏓 Current Score: ${ballPlayer1Name}: ${room.ball.player1.playerScore} - ${ballPlayer2Name}: ${room.ball.player2.playerScore}`);
              }
              gameEngine.broadcastToRoom(roomId, {
                type: 'scoreUpdate',
                scores: {
                  [room.players[0].id]: room.ball.player1.playerScore,
                  [room.players[1].id]: room.ball.player2.playerScore,
                },
                roomId: roomId
              });
              gameEngine.endGame(room, roomId);
            }
          }
        }

        if (now - lastSync >= SYNC_INTERVAL) {
          // Create current state objects
          const playerPositions = {};
          room.players.forEach(player => {
            playerPositions[player.id] = player.positionZ;
          });

          const ballState = room.ball ? {
            position: { x: room.ball.position.x, y: room.ball.position.y, z: room.ball.position.z },
            velocity: { x: room.ball.velocity.x, y: room.ball.velocity.y, z: room.ball.velocity.z },
            previousVelocity: { x: room.ball.previousVelocity.x, y: room.ball.previousVelocity.y, z: room.ball.previousVelocity.z },
            rebounds: room.ball.rebounds,
            isRespawning: room.ball.isRespawning,
            respawnTime: room.ball.respawnTime,
            wasHitByPlayer: room.ball.wasHitByPlayer,
            speed: room.ball.speed,
            currentGlowColor: { r: room.ball.currentGlowColor.r, g: room.ball.currentGlowColor.g, b: room.ball.currentGlowColor.b },
            shouldGlow: room.ball.shouldGlow
          } : null;

          // Get previous state or initialize
          const prevState = previousStates.get(roomId) || { playerPositions: {}, ballState: null };
          
          // Calculate delta for player positions
          const changedPlayerPositions = {};
          let hasPlayerChanges = false;
          
          Object.entries(playerPositions).forEach(([playerId, position]) => {
            const prevPosition = prevState.playerPositions[playerId];
            if (prevPosition === undefined || Math.abs(position - prevPosition) >= 0.01) {
              changedPlayerPositions[playerId] = position;
              hasPlayerChanges = true;
            }
          });
          
          // Check if ball state has meaningful changes
          let hasBallChanges = false;
          let deltaballState = null;
          
          if (ballState && prevState.ballState) {
            // Check position changes (most important for visual smoothness)
            const posChanged = 
              Math.abs(ballState.position.x - prevState.ballState.position.x) >= 0.01 ||
              Math.abs(ballState.position.y - prevState.ballState.position.y) >= 0.01 ||
              Math.abs(ballState.position.z - prevState.ballState.position.z) >= 0.01;
              
            // Check velocity changes (important for prediction)
            const velChanged = 
              Math.abs(ballState.velocity.x - prevState.ballState.velocity.x) >= 0.01 ||
              Math.abs(ballState.velocity.y - prevState.ballState.velocity.y) >= 0.01 ||
              Math.abs(ballState.velocity.z - prevState.ballState.velocity.z) >= 0.01;
              
            // Check other critical state changes
            const stateChanged = 
              ballState.rebounds !== prevState.ballState.rebounds ||
              ballState.isRespawning !== prevState.ballState.isRespawning ||
              ballState.speed !== prevState.ballState.speed ||
              ballState.shouldGlow !== prevState.ballState.shouldGlow;
              
            // Check glow color changes (important for visual effects)
            const glowChanged = 
              ballState.shouldGlow && (
                Math.abs(ballState.currentGlowColor.r - prevState.ballState.currentGlowColor.r) >= 0.01 ||
                Math.abs(ballState.currentGlowColor.g - prevState.ballState.currentGlowColor.g) >= 0.01 ||
                Math.abs(ballState.currentGlowColor.b - prevState.ballState.currentGlowColor.b) >= 0.01
              );
              
            hasBallChanges = posChanged || velChanged || stateChanged || glowChanged;
            
            // During respawn, always send updates to ensure smooth animation
            if (ballState.isRespawning) {
              hasBallChanges = true;
            }
            
            if (hasBallChanges) {
              deltaballState = ballState;
            }
          } else if (ballState !== prevState.ballState) {
            // One is null and the other isn't, or first update
            hasBallChanges = true;
            deltaballState = ballState;
          }
          
          // Only send sync if we have changes to report
          if (hasPlayerChanges || hasBallChanges) {
          gameEngine.broadcastToRoom(roomId, {
            type: 'sync',
              playerPositions: changedPlayerPositions,
              ballState: deltaballState,
            serverTime: now,
              roomId: roomId,
              // Flag to indicate this is a delta update
              isDelta: true
            });
            
            // Update previous state
            previousStates.set(roomId, {
              playerPositions: {...playerPositions},
              ballState: ballState ? {...ballState} : null
            });
          }
          
          lastSync = now;
        }
      });
    } catch (e) {
      console.error('Game loop error:', e);
    }

    if (now - lastBroadcast >= 1000 / BROADCAST_FPS) {
      lastBroadcast = now;
    }

    setTimeout(update, 1000 / FPS);
  };
  update();
}