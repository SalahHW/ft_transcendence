import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import { getPlayers, getGameState, createOrJoinRoom, broadcastToRoom, checkRoomReady, sendBallUpdateForced } from './gameState.js';

// Register WebSocket routes
export async function registerWebSocketRoutes(fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    console.log('WebSocket route hit, connection:', Object.keys(connection));
    const ws = connection;
    if (!ws) {
      console.error('WebSocket connection is undefined, connection:', connection);
      return;
    }
    console.log('WebSocket connection established, readyState:', ws.readyState);

    let playerId = req.query.playerId || fastify.uuid();
    let player = getPlayers().get(playerId);
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
      getPlayers().set(playerId, player);
    } else {
      player.ws = ws;
    }

    const roomId = createOrJoinRoom(playerId, player, ws);

    // Set connection metadata
    try {
      ws.playerId = playerId;
      ws.roomId = roomId;
    } catch (e) {
      console.error(`Failed to set ws metadata for player ${playerId}:`, e);
      return;
    }

    console.log(`Player connected: ${playerId} in room ${roomId}, total rooms: ${getGameState().gameRooms.size}`);

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
        const roomAnimStatus = getGameState().animationStatus.get(roomId);
        if (roomAnimStatus) {
          roomAnimStatus.add(playerId);
          console.log(`Player ${playerId} completed animation in room ${roomId}, status size: ${roomAnimStatus.size}`);
          if (roomAnimStatus.size === 2 && getGameState().gameRooms.get(roomId)?.ready) {
            console.log(`Both players completed animations in room ${roomId}, sending ballUpdate`);
            sendBallUpdateForced(roomId);
          }
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
}

// Handle player input
function handlePlayerInput(data, playerId, roomId) {
  let msg;
  try {
    msg = JSON.parse(data);
  } catch (e) {
    return console.error('Bad JSON:', e);
  }

  const player = getPlayers().get(playerId);
  const room = getGameState().gameRooms.get(roomId) || { players: [] };
  if (!player || !room) {
    console.warn(`Invalid input: player ${playerId} or room ${roomId} not found`);
    return;
  }

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
        { playerId: room.players[0]?.id || playerId, playerScore: 0 },
        { playerId: room.players[1]?.id || playerId, playerScore: 0 }
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
    room.ball.isRespawning = true;
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
  const player = getPlayers().get(playerId);
  if (player && player.ws) {
    try {
      if (player.ws.readyState === 1) {
        player.ws.close();
      }
    } catch (e) {
      console.error(`Error closing WebSocket for player ${playerId}:`, e);
    }
    getPlayers().delete(playerId);
  }
  const room = getGameState().gameRooms.get(roomId) || { players: [] };
  room.players = room.players.filter(p => p.id !== playerId);
  if (room.players.length === 0) {
    getGameState().gameRooms.delete(roomId);
    getGameState().animationStatus.delete(roomId);
    console.log(`Room ${roomId} deleted, no players left`);
  } else {
    getGameState().gameRooms.set(roomId, room);
  }
}