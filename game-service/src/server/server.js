import Fastify from 'fastify';
import WebSocketPlugin from '@fastify/websocket';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import { registerApiRoutes } from './api.js';

// Load environment variables
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

// Add UUID generator to Fastify instance
fastify.decorate('uuid', uuidv4);

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
const players = new Map();

// Track animation completion
const animationStatus = new Map(); // roomId -> Set(playerId)

// Register API routes
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

    let playerId = req.query.playerId || uuidv4();
    let player = players.get(playerId);
    if (!player) {
      player = {
        ws,
        id: playerId,
        username: null,
        positionZ: 0,
        isUpPressed: false,
        isDownPressed: false,
        lastUpdate: Date.now(),
        playerScore: 0,
      };
      players.set(playerId, player);
    } else {
      player.ws = ws;
    }

    // Find or create a game room
    let roomId = null;
    for (const [rId, room] of gameRooms.entries()) {
      if (room.players.length < 2 && !room.isGameOver && !room.ready) {
        room.players.push(player);
        roomId = rId;
        console.log(`Player ${playerId} joined existing room ${roomId}`);
        break;
      }
    }
    if (!roomId) {
      roomId = uuidv4();
      const newRoom = {
        players: [player],
        ball: new Ball(
          { playerId: playerId, playerScore: 0 },
          { playerId: null, playerScore: 0 }
        ),
        isGameOver: false,
        ready: false,
        ballUpdateSent: false // Track initial ballUpdate
      };
      newRoom.ball.position = new BABYLON.Vector3(0, -2, 0);
      newRoom.ball.isRespawning = true;
      newRoom.ball.respawnTime = 0;
      newRoom.ball.hasValidPosition = true;
      gameRooms.set(roomId, newRoom);
      animationStatus.set(roomId, new Set());
      console.log(`Created new room ${roomId} for player ${playerId} with ball initialized`);
    } else {
      const room = gameRooms.get(roomId);
      room.ball.player2.playerId = playerId;
      console.log(`Updated ball player2 ID to ${playerId} in room ${roomId}`);
    }

    // Set connection metadata
    try {
      ws.playerId = playerId;
      ws.roomId = roomId;
    } catch (e) {
      console.error(`Failed to set ws metadata for player ${playerId}:`, e);
      return;
    }

    console.log(`Player connected: ${playerId} in room ${roomId}, total rooms: ${gameRooms.size}`);

    // Handle player messages
    let messageCount = 0;
    ws.on('message', (data) => {
      messageCount++;
      if (messageCount % 10 === 0) {
        console.log('Received WebSocket message:', data.toString());
      }
      let msg;
      try {
        msg = JSON.parse(data);
      } catch (e) {
        console.error('Bad JSON:', e);
        return;
      }

      // Handle animation completion
      if (msg.type === 'animationComplete') {
        const roomAnimStatus = animationStatus.get(roomId);
        if (roomAnimStatus) {
          roomAnimStatus.add(playerId);
          console.log(`Player ${playerId} completed animation in room ${roomId}, status size: ${roomAnimStatus.size}`);
          sendBallUpdate(roomId);
        } else {
          console.error(`No animationStatus for room ${roomId}`);
        }
        return;
      }

      // Handle username setting
      if (msg.type === 'setUsername') {
        const providedPlayerId = msg.playerId || playerId;
        if (providedPlayerId !== playerId) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid playerId',
          }));
          return;
        }
        if (player.username) {
          console.log(`Player ${playerId} already has username ${player.username} from API`);
          broadcastToRoom(roomId, {
            type: 'usernameUpdate',
            playerId,
            username: player.username,
          });
          checkRoomReady(roomId);
          return;
        }
        const username = msg.username?.trim();
        if (typeof username === 'string' && username.length > 0 && username.length <= 20) {
          player.username = username;
          console.log(`Player ${playerId} set username to ${username}`);
          broadcastToRoom(roomId, {
            type: 'usernameUpdate',
            playerId,
            username,
          });
          checkRoomReady(roomId);
        } else {
          console.warn(`Invalid username from player ${playerId}:`, msg.username);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid username: must be a string (1-20 characters)',
          }));
        }
        return;
      }

      handlePlayerInput(data, playerId, roomId);
    });

    // Handle player disconnect
    ws.on('close', () => {
      console.log('WebSocket closed for player');
      handlePlayerDisconnect(playerId, roomId);
    });
  });
});

// Check if room is ready to start
function checkRoomReady(roomId) {
  const room = gameRooms.get(roomId);
  if (!room || room.players.length !== 2 || room.ready) return;

  const allReady = room.players.every(player => player.username && player.ws && player.ws.readyState === 1);

  if (allReady) {
    room.ready = true;
    console.log(`Room ${roomId} is ready, starting game at ${Date.now()}`);
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
          console.log(`Sent init to player ${p.id} in room ${roomId}`);
        } catch (e) {
          console.error(`Failed to send init to player ${p.id}:`, e);
        }
      }
    });
  }
}

// Send ball update after animations
function sendBallUpdate(roomId) {
  const room = gameRooms.get(roomId);
  if (!room || room.players.length !== 2) {
    console.warn(`Cannot send ballUpdate for room ${roomId}: invalid state`, {
      exists: !!room,
      playerCount: room?.players.length
    });
    return;
  }

  const roomAnimStatus = animationStatus.get(roomId);
  if (roomAnimStatus.size !== 2) {
    console.log(`Waiting for animations in room ${roomId}: ${roomAnimStatus.size}/2 completed`);
    // Force ball update after 6s if animations are not complete
    if (!room.ballUpdateTimeout) {
      room.ballUpdateTimeout = setTimeout(() => {
        console.log(`Forcing ballUpdate for room ${roomId} due to timeout`);
        sendBallUpdateForced(roomId);
      }, 6000);
    }
    return;
  }

  // Clear timeout and animation status
  if (room.ballUpdateTimeout) {
    clearTimeout(room.ballUpdateTimeout);
    room.ballUpdateTimeout = null;
  }

  sendBallUpdateForced(roomId);
}

// Forced ball update
function sendBallUpdateForced(roomId) {
  const room = gameRooms.get(roomId);
  if (!room || room.players.length !== 2) {
    console.warn(`Cannot send forced ballUpdate for room ${roomId}: invalid state`);
    return;
  }

  if (!room.ball) {
    console.error(`Ball not initialized for room ${roomId}, creating new`);
    room.ball = new Ball(
      { playerId: room.players[0].id, playerScore: 0 },
      { playerId: room.players[1].id, playerScore: 0 }
    );
    room.ball.position = new BABYLON.Vector3(0, -2, 0);
    room.ball.isRespawning = true;
    room.ball.respawnTime = 0;
    room.ball.hasValidPosition = true;
  }

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
  console.log(`Sending initial ballUpdate for room ${roomId} at ${Date.now()}:`, ballState);
  broadcastToRoom(roomId, {
    type: 'ballUpdate',
    ballState,
    isInitialSpawn: true,
    isScoreRespawn: false
  });

  // Clear animation status and mark ballUpdate sent
  const roomAnimStatus = animationStatus.get(roomId);
  if (roomAnimStatus) {
    roomAnimStatus.clear();
    console.log(`Cleared animationStatus for room ${roomId}`);
  }
  room.ballUpdateSent = true;
}

// Broadcast to room
function broadcastToRoom(roomId, message) {
  const json = JSON.stringify(message);
  const room = gameRooms.get(roomId) || { players: [] };
  room.players = room.players.filter(p => p.ws && p.ws.readyState === 1);
  console.log(`Broadcasting to room ${roomId}, players: ${room.players.map(p => p.id).join(', ')}`);
  room.players.forEach(({ ws, id }) => {
    if (ws && ws.readyState === 1) {
      try {
        ws.send(json);
        console.log(`Sent ${message.type} to player ${id} in room ${roomId}`);
      } catch (e) {
        console.error(`Failed to send to player ${id} in room ${roomId}:`, e);
      }
    } else {
      console.log(`Failed to send to player ${id} in room ${roomId}: WebSocket not open`);
    }
  });
}

// Handle player input
function handlePlayerInput(data, playerId, roomId) {
  let msg;
  try {
    msg = JSON.parse(data);
  } catch (e) {
    return console.error('Bad JSON:', e);
  }

  const player = players.get(playerId);
  const room = gameRooms.get(roomId) || { players: [] };
  if (!player || room.players.length !== 2) return;

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
    if (msg.isInitial) {
      room.ball.position = new BABYLON.Vector3(0, -2, 0);
      room.ball.isRespawning = true;
      room.ball.respawnTime = 0;
      room.ball.hasValidPosition = true;
    } else {
      room.ball.init();
    }
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
    console.log(`Sending ballUpdate on requestBallRespawn at ${Date.now()}:`, ballState);
    broadcastToRoom(roomId, {
      type: 'ballUpdate',
      ballState,
      isInitialSpawn: msg.isInitial || false,
      isScoreRespawn: !msg.isInitial
    });
    room.ballUpdateSent = true;
  }
}

// Handle player disconnect
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
    animationStatus.delete(roomId);
    console.log(`Room ${roomId} deleted, no players left`);
  } else {
    gameRooms.set(roomId, room);
  }
}

// Check for end game condition
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
      serverTime: Date.now(),
    });
  }

  return winnerId;
}

// Game loop
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
        console.log(`Room ${roomId} paddle positions: paddle1=${JSON.stringify(paddle1Pos)}, paddle2=${JSON.stringify(paddle2Pos)}`);
        const prevScore1 = room.ball.player1.playerScore;
        const prevScore2 = room.ball.player2.playerScore;
        // Skip ball update during initial respawn until ballUpdate is sent
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