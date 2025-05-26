import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';

// Game state
const gameRooms = new Map();
const players = new Map();
const animationStatus = new Map(); // roomId -> Set(playerId)

// Export players for API routes
export function getPlayers() {
  return players;
}

// Check if room is ready to start
export function checkRoomReady(roomId) {
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
    // Schedule ball update after a short delay to allow init messages to process
    setTimeout(() => {
      const roomAnimStatus = animationStatus.get(roomId);
      if (roomAnimStatus?.size === 2 && gameRooms.get(roomId)?.ready) {
        console.log(`Both players ready in room ${roomId}, sending initial ballUpdate`);
        sendBallUpdateForced(roomId);
      }
    }, 500);
  }
}

// Send ball update after animations
export function sendBallUpdate(roomId) {
  const room = gameRooms.get(roomId);
  if (!room || room.players.length !== 2) {
    console.warn(`Cannot send ballUpdate for room ${roomId}: invalid state`, {
      exists: !!room,
      playerCount: room?.players.length
    });
    return;
  }

  const roomAnimStatus = animationStatus.get(roomId);
  if (roomAnimStatus?.size === 2) {
    console.log(`Both players completed animations in room ${roomId}, sending ballUpdate`);
    sendBallUpdateForced(roomId);
  } else {
    console.log(`Waiting for animations in room ${roomId}, status size: ${roomAnimStatus?.size || 0}`);
  }
}

// Forced ball update
export function sendBallUpdateForced(roomId) {
  const room = gameRooms.get(roomId);
  if (!room || room.players.length !== 2) {
    console.warn(`Cannot send forced ballUpdate for room ${roomId}: invalid state`, {
      exists: !!room,
      playerCount: room?.players.length
    });
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

  room.ball.isRespawning = true;
  room.ball.respawnTime = 0;

  const ballState = {
    position: { x: room.ball.position.x, y:

 room.ball.position.y, z: room.ball.position.z },
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
    isInitialSpawn: !room.ballUpdateSent,
    isScoreRespawn: false
  });

  const roomAnimStatus = animationStatus.get(roomId);
  if (roomAnimStatus) {
    roomAnimStatus.clear();
    console.log(`Cleared animationStatus for room ${roomId}`);
  }
  room.ballUpdateSent = true;
  room.ballUpdateTimeout = null;
}

// Broadcast to room
export function broadcastToRoom(roomId, message) {
  const json = JSON.stringify(message);
  const room = gameRooms.get(roomId) || { players: [] };
  room.players = room.players.filter(p => p.ws && p.ws.readyState === 1);
  room.players.forEach(({ ws, id }) => {
    if (ws && ws.readyState === 1) {
      try {
        ws.send(json);
        console.log(`Sent ${message.type} to player ${id} in room ${roomId}`);
      } catch (e) {
        console.error(`Failed to send to player ${id} in room ${roomId}:`, e);
      }
    } else {
      console.warn(`Failed to send to player ${id} in room ${roomId}: WebSocket not open, readyState=${ws?.readyState}`);
    }
  });
}

// Check for end game condition
export function endGame(room, roomId) {
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

// Create or join a game room
export function createOrJoinRoom(playerId, player, ws) {
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
    roomId = playerId; // Use playerId as roomId for simplicity
    const newRoom = {
      players: [player],
      ball: new Ball(
        { playerId: playerId, playerScore: 0 },
        { playerId: null, playerScore: 0 }
      ),
      isGameOver: false,
      ready: false,
      ballUpdateSent: false,
      ballUpdateTimeout: null,
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
    checkRoomReady(roomId);
  }
  return roomId;
}

// Get game rooms and players for game loop
export function getGameState() {
  return { gameRooms, players, animationStatus };
}