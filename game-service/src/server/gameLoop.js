import * as BABYLON from '@babylonjs/core';
import { getGameState, broadcastToRoom, endGame } from './gameState.js';

// Game loop
export function startGameLoop() {
  const FPS = 240;
  const BROADCAST_FPS = 60;
  const SYNC_INTERVAL = 5;
  let lastBroadcast = Date.now();
  let lastSync = Date.now();
  let frameCount = 0;
  let lastFrameTime = Date.now();

  const { gameRooms } = getGameState();

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
        if (room.players.length !== 2 || room.isGameOver) return;

        room.players.forEach((player, index) => {
          const speed = 20;
          const halfD = 7.5;
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
            broadcastToRoom(roomId, {
              type: 'paddleMove',
              playerId: player.id,
              positionZ: player.positionZ,
            });
          }
        });

        if (room.ball) {
          const paddle1Pos = new BABYLON.Vector3(19.5, 2, room.players[0].positionZ);
          const paddle2Pos = new BABYLON.Vector3(-19.5, 2, room.players[1].positionZ);
          const prevScore1 = room.ball.player1.playerScore;
          const prevScore2 = room.ball.player2.playerScore;
          if (!room.ballUpdateSent && room.ball.isRespawning) {
            // Keep ball in initial state
          } else {
            room.ball.update(deltaTime, paddle1Pos, paddle2Pos);
          }
          if (room.ball.player1.playerScore !== prevScore1 || room.ball.player2.playerScore !== prevScore2) {
            console.log(`Sending scoreUpdate at ${Date.now()}:`, {
              [room.players[0].id]: room.ball.player1.playerScore,
              [room.players[1].id]: room.ball.player2.playerScore
            });
            broadcastToRoom(roomId, {
              type: 'scoreUpdate',
              scores: {
                [room.players[0].id]: room.ball.player1.playerScore,
                [room.players[1].id]: room.ball.player2.playerScore,
              },
            });
            const ballState = {
              position: { x: room.ball.position.x, y: room.ball.position.y, z: room.ball.position.z },
              velocity: { x: room.ball.velocity.x, y: room.ball.velocity.y, z: room.ball.velocity.z },
              previousVelocity: { x: room.ball.previousVelocity.x, y: room.ball.previousVelocity.y, z: room.ball.previousVelocity.z },
              rebounds: room.ball.rebounds,
              isRespawning: room.ball.isRespawning,
              respawnTime: room.ball.respawnTime,
              wasHitByPlayer: room.ball.wasHitByPlayer,
              speed: room.ball.speed,
            };
            console.log(`Sending score ballUpdate at ${Date.now()}:`, ballState);
            broadcastToRoom(roomId, {
              type: 'ballUpdate',
              ballState,
              isInitialSpawn: false,
              isScoreRespawn: true,
            });
            endGame(room, roomId);
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
          } : null;
          broadcastToRoom(roomId, {
            type: 'sync',
            playerPositions,
            ballState,
            serverTime: now,
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