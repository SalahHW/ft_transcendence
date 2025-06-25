import * as BABYLON from '@babylonjs/core';
import { getGameState, broadcastToRoom, endGame } from './gameState.js';
import { GAME_CONFIG } from '../core/constants.js';
import { RoomUtils } from '../utils/helpers.js';
import { gameStateManager } from '../game/GameStateManager.js';
import { gameEngine } from '../game/GameEngine.js';

export function startGameLoop() {
  const FPS = GAME_CONFIG.FPS;
  const BROADCAST_FPS = GAME_CONFIG.BROADCAST_FPS;
  const SYNC_INTERVAL = GAME_CONFIG.SYNC_INTERVAL;
  let lastBroadcast = Date.now();
  let lastSync = Date.now();
  let frameCount = 0;
  let lastFrameTime = Date.now();

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

        room.players.forEach((player, index) => {
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

          if ((player.isUpPressed || player.isDownPressed) && now - lastBroadcast >= 1000 / BROADCAST_FPS) {
            gameEngine.broadcastToRoom(roomId, {
              type: 'paddleMove',
              playerId: player.id,
              positionZ: player.positionZ,
              roomId: roomId
            });
          }
        });

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

        if (now - lastSync >= SYNC_INTERVAL) {
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
          gameEngine.broadcastToRoom(roomId, {
            type: 'sync',
            playerPositions,
            ballState,
            serverTime: now,
            roomId: roomId
          });
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