import Fastify from 'fastify';
import WebSocketPlugin from '@fastify/websocket';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import { registerApiRoutes } from './api.js'; // Import API routes

// Load environment variables from .env file
dotenv.config();

// Read HTTPS certificates
const serverConfig = {
  key: fs.readFileSync('src/server/certs/key.pem'),
  cert: fs.readFileSync('src/server/certs/cert.pem'),
};

// Initialize Fastify with HTTPS
const fastify = Fastify({
  https: serverConfig,
  logger: true,
});

// Debug: Log Fastify and plugin versions
console.log('Fastify version:', Fastify.version);
console.log('Registering @fastify/websocket plugin');

// Register WebSocket plugin
fastify.register(WebSocketPlugin, {
  options: {
    clientTracking: true,
    verifyClient: (info, next) => {
      console.log('Verifying WebSocket client:', info.req.url);
      next(true);
    },
  },
}).after(err => {
  if (err) {
    console.error('Failed to register @fastify/websocket:', err);
    process.exit(1);
  }
  console.log('@fastify/websocket registered successfully');
});

// Game state
const gameRooms = new Map();
const players = new Map(); // Shared with api.js

// Register API routes, passing players Map
fastify.register(registerApiRoutes, { players });

// WebSocket route for game connections
fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    console.log('WebSocket route hit, connection:', Object.keys(connection));
    const ws = connection;
    if (!ws) {
      console.error('WebSocket connection is undefined, connection:', connection);
      return;
    }
    console.log('WebSocket connection established, readyState:', ws.readyState);

    const playerId = uuidv4();
    const player = {
      ws,
      id: playerId,
      username: null, // Initialize username
      positionZ: 0,
      isUpPressed: false,
      isDownPressed: false,
      lastUpdate: Date.now(),
      playerScore: 0,
    };
    players.set(playerId, player);

    // Find or create a game room
    let roomId = null;
    for (const [rId, room] of gameRooms.entries()) {
      if (room.players.length < 2 && !room.isGameOver) {
        room.players.push(player);
        roomId = rId;
        break;
      }
    }
    if (!roomId) {
      roomId = uuidv4();
      gameRooms.set(roomId, { players: [player], ball: null, isGameOver: false });
    }

    // Set connection metadata
    try {
      ws.playerId = playerId;
      ws.roomId = roomId;
    } catch (e) {
      console.error(`Failed to set ws metadata for player ${playerId}:`, e);
      return;
    }

    console.log(`Player connected: ${playerId} in room ${roomId}`);

    // Notify players of game start
    const room = gameRooms.get(roomId);
    if (room.players.length === 2) {
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
            }));
          } catch (e) {
            console.error(`Failed to send init to player ${p.id}:`, e);
          }
        } else {
          console.log(`Cannot send init to player ${p.id}: WebSocket not open`);
        }
      });
      room.ball = new Ball(
        { playerId: room.players[0].id, playerScore: 0 },
        { playerId: room.players[1].id, playerScore: 0 }
      );
      room.ball.init();
      const ballState = {
        position: { x: room.ball.position.x, y: room.ball.position.y, z: room.ball.position.z },
        velocity: room.ball.velocity,
        previousVelocity: room.ball.previousVelocity,
        rebounds: room.ball.rebounds,
        isRespawning: room.ball.isRespawning,
        respawnTime: room.ball.respawnTime,
        wasHitByPlayer: room.ball.wasHitByPlayer,
        speed: room.ball.speed,
      };
      broadcastToRoom(roomId, {
        type: 'ballUpdate',
        ballState,
        isInitialSpawn: true,
      });
    }

    // Handle player messages
    ws.on('message', (data) => {
      console.log('Received WebSocket message:', data.toString());
      let msg;
      try {
        msg = JSON.parse(data);
      } catch (e) {
        console.error('Bad JSON:', e);
        return;
      }

      // Handle username setting
      if (msg.type === 'setUsername') {
        const username = msg.username?.trim();
        if (typeof username === 'string' && username.length > 0 && username.length <= 20) {
          player.username = username;
          console.log(`Player ${playerId} set username to ${username}`);
          // Notify room of username update
          broadcastToRoom(roomId, {
            type: 'usernameUpdate',
            playerId,
            username,
          });
        } else {
          console.warn(`Invalid username from player ${playerId}:`, msg.username);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid username: must be a string (1-20 characters)',
          }));
        }
        return;
      }

      // Existing input handling
      handlePlayerInput(data, playerId, roomId);
    });

    // Handle player disconnect
    ws.on('close', () => {
      console.log('WebSocket closed for player');
      handlePlayerDisconnect(playerId, roomId);
    });
  });
});

// Broadcast to room
function broadcastToRoom(roomId, message) {
  const json = JSON.stringify(message);
  const room = gameRooms.get(roomId) || { players: [] };
  room.players = room.players.filter(p => p.ws && p.ws.readyState === 1);
  room.players.forEach(({ ws, id }) => {
    if (ws && ws.readyState === 1) {
      try {
        ws.send(json);
      } catch (e) {
        console.error(`Failed to send to player ${id} in room ${roomId}:`, e);
      }
    } else {
      console.log(`Failed to send to player ${id} in room ${roomId}: WebSocket not open or undefined`);
    }
  });
}

// Handle player input (unchanged)
function handlePlayerInput(data, playerId, roomId) {
  let msg;
  try {
    msg = JSON.parse(data);
  } catch (e) {
    return console.error('Bad JSON:', e);
  }

  const player = players.get(playerId);
  const room = gameRooms.get(roomId) || { players: [] };
  if (!player || room.players.length !== 2 || room.isGameOver) return;

  if (msg.type === 'keyDown') {
    if (msg.direction === 'up') {
      player.isUpPressed = true;
    } else if (msg.direction === 'down') {
      player.isDownPressed = true;
    }
  } else if (msg.type === 'keyUp') {
    if (msg.direction === 'up') {
      player.isUpPressed = false;
    } else if (msg.direction === 'down') {
      player.isDownPressed = false;
    }
  } else if (msg.type === 'paddlePosition') {
    const { positionZ } = msg;
    const now = Date.now();
    const deltaTime = (now - player.lastUpdate) / 1000;
    const maxDeltaZ = 20 * deltaTime;
    const clampedZ = Math.max(-7.5, Math.min(7.5, positionZ));
    const diff = Math.abs(clampedZ - player.positionZ);
    if (diff <= maxDeltaZ + 0.01) {
      player.positionZ = Number(clampedZ.toFixed(3));
    }
    player.lastUpdate = now;
  } else if (msg.type === 'requestBallRespawn') {
    if (!room.ball) {
      room.ball = new Ball(
        { playerId: room.players[0].id, playerScore: 0 },
        { playerId: room.players[1].id, playerScore: 0 }
      );
      console.log(`Room ${roomId} ball created on requestBallRespawn`);
    }
    room.ball.init();
    const ballState = {
      position: { x: room.ball.position.x, y: room.ball.position.y, z: room.ball.position.z },
      velocity: room.ball.velocity,
      previousVelocity: room.ball.previousVelocity,
      rebounds: room.ball.rebounds,
      isRespawning: room.ball.isRespawning,
      respawnTime: room.ball.respawnTime,
      wasHitByPlayer: room.ball.wasHitByPlayer,
      speed: room.ball.speed,
    };
    if (ballState.isRespawning && ballState.respawnTime === 0 && ballState.position.y !== -2) {
      console.error(`Invalid initial ball position: y=${ballState.position.y}, expected y=-2`);
      ballState.position.y = -2;
    }
    broadcastToRoom(roomId, {
      type: 'ballUpdate',
      ballState,
      isInitialSpawn: true,
    });
  }
}

// Handle player disconnect (unchanged)
function handlePlayerDisconnect(playerId, roomId) {
  console.log(`Player disconnected: ${playerId} from room ${roomId}`);
  const player = players.get(playerId);
  if (player && player.ws) {
    try {
      if (player.ws.readyState === 1) {
        player.ws.close();
      }
    } catch (e) {
      console.error(`Error closing WebSocket for player ${playerId}:`, e);
    }
    players.delete(playerId);
  }
  const room = gameRooms.get(roomId) || { players: [] };
  room.players = room.players.filter(p => p.id !== playerId);
  if (room.players.length === 0) {
    gameRooms.delete(roomId);
  } else {
    gameRooms.set(roomId, room);
  }
}

function endGame(room, roomId) {
  if (!room.ball || room.isGameOver) return null;

  const score1 = room.ball.player1.playerScore;
  const score2 = room.ball.player2.playerScore;
  let winnerId = null;

  if (score1 >= 11 && score1 > score2) {
    winnerId = room.players[0].id;
  } else if (score2 >= 11 && score2 > score1) {
    winnerId = room.players[1].id;
  }
  if (winnerId) {
    room.isGameOver = true;
    console.log(`Room ${roomId} game ended: Winner=${winnerId}, Scores=${score1}-${score2}`);
    broadcastToRoom(roomId, {
      type: 'gameEnd',
      winnerId,
      scores: {
        [room.players[0].id]: score1,
        [room.players[1].id]: score2,
      },
      serverTime: Date.now(), // New: Add server timestamp
    });
  }

  return winnerId;
}

// Game loop (unchanged)
function startGameLoop() {
  const FPS = 1000;
  const BROADCAST_FPS = 60;
  const SYNC_INTERVAL = 5;
  let lastBroadcast = Date.now();
  let lastSync = Date.now();
  let frameCount = 0;
  let lastFrameTime = Date.now();

  const update = () => {
    const now = Date.now();
    const deltaTime = 1 / FPS;
    frameCount++;
    if (now - lastFrameTime >= 1000) {
      console.log(`Server FPS: ${frameCount}`);
      frameCount = 0;
      lastFrameTime = now;
    }

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
        room.ball.update(deltaTime, paddle1Pos, paddle2Pos);
        if (room.ball.player1.playerScore !== prevScore1 || room.ball.player2.playerScore !== prevScore2) {
          broadcastToRoom(roomId, {
            type: 'scoreUpdate',
            scores: {
              [room.players[0].id]: room.ball.player1.playerScore,
              [room.players[1].id]: room.ball.player2.playerScore,
            },
          });
          const ballState = {
            position: { x: room.ball.position.x, y: room.ball.position.y, z: room.ball.position.z },
            velocity: room.ball.velocity,
            previousVelocity: room.ball.previousVelocity,
            rebounds: room.ball.rebounds,
            isRespawning: room.ball.isRespawning,
            respawnTime: room.ball.respawnTime,
            wasHitByPlayer: room.ball.wasHitByPlayer,
            speed: room.ball.speed,
          };
          if (ballState.isRespawning && ballState.respawnTime === 0 && ballState.position.y !== -2) {
            console.error(`Invalid score ball position: y=${ballState.position.y}, expected y=-2`);
            ballState.position.y = -2;
          }
          broadcastToRoom(roomId, {
            type: 'ballUpdate',
            ballState,
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

    if (now - lastBroadcast >= 1000 / BROADCAST_FPS) {
      lastBroadcast = now;
    }

    setTimeout(update, 1000 / FPS);
  };
  update();
}

// Start the server
const port = process.env.GAME_SERVICE_PORT || 8080;
fastify.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Game server running on port ${port}`);
  startGameLoop();
});