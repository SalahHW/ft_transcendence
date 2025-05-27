import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';

const gameRooms = new Map();
const players = new Map();
const animationStatus = new Map();

export function checkRoomReady(roomId) {
  const room = gameRooms.get(roomId);
  if (!room || room.players.length !== 2 || room.ready) return;

  const allReady = room.players.every(player => player.username && player.ws && player.ws.readyState === 1);

  if (allReady) {
    room.ready = true;
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
      }
    });
    // Ensure animationStatus is initialized
    if (!animationStatus.has(roomId)) {
      animationStatus.set(roomId, new Set());
    }
    // Retry ball update
    const attemptBallUpdate = (attempt = 1) => {
      const roomAnimStatus = animationStatus.get(roomId);
      if (roomAnimStatus?.size === 2 && gameRooms.get(roomId)?.ready) {
        sendBallUpdateForced(roomId);
      } else if (attempt <= 3) {
        console.warn(`Waiting for animations in room ${roomId}, attempt ${attempt}, status size: ${roomAnimStatus?.size || 0}`);
        setTimeout(() => attemptBallUpdate(attempt + 1), 500);
      } else {
        console.error(`Forcing ballUpdate for room ${roomId} after ${attempt - 1} attempts`);
        room.ballUpdateSent = false;
        sendBallUpdateForced(roomId);
      }
    };
    setTimeout(() => attemptBallUpdate(), 500);
  }
}

export function sendBallUpdate(roomId) {
  const room = gameRooms.get(roomId);
  if (!room || room.players.length !== 2) return;

  if (!room.ballUpdateSent) {
    sendBallUpdateForced(roomId);
  }
}

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
    room.ball.setFirstVelocity(); // Set initial velocity immediately
  }

  room.ball.isRespawning = true;
  room.ball.respawnTime = 0;

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
  broadcastToRoom(roomId, {
    type: 'ballUpdate',
    ballState,
    isInitialSpawn: !room.ballUpdateSent,
    isScoreRespawn: false
  });

  const roomAnimStatus = animationStatus.get(roomId);
  if (roomAnimStatus) {
    roomAnimStatus.clear();
  }
  room.ballUpdateSent = true;
  room.ballUpdateTimeout = null;
}

export function broadcastToRoom(roomId, message) {
  const json = JSON.stringify(message);
  const room = gameRooms.get(roomId) || { players: [] };
  room.players = room.players.filter(p => p.ws && p.ws.readyState === 1);
  room.players.forEach(({ ws, id }) => {
    if (ws && ws.readyState === 1) {
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

export function endGame(room, roomId) {
  if (room.ball.player1.playerScore >= 11 || room.ball.player2.playerScore >= 11) {
    room.isGameOver = true;
    let winnerId = null;
    if (room.ball.player1.playerScore >= 11) {
      winnerId = room.players[0].id;
    } else if (room.ball.player2.playerScore >= 11) {
      winnerId = room.players[1].id;
    }
    broadcastToRoom(roomId, {
      type: 'gameEnd',
      winnerId,
      scores: {
        [room.players[0].id]: room.ball.player1.playerScore,
        [room.players[1].id]: room.ball.player2.playerScore,
      },
      serverTime: Date.now(),
    });
  }
}

export function createOrJoinRoom(playerId, player, ws) {
  let roomId = null;
  for (const [rId, room] of gameRooms.entries()) {
    if (room.players.length < 2 && !room.isGameOver && !room.ready) {
      room.players.push(player);
      roomId = rId;
      break;
    }
  }
  if (!roomId) {
    roomId = playerId;
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
  } else {
    const room = gameRooms.get(roomId);
    room.ball.player2.playerId = playerId;
    room.ballUpdateSent = false; // Reset to ensure ballUpdate
    checkRoomReady(roomId);
  }
  return roomId;
}

export function getGameState() {
  return { gameRooms, players, animationStatus };
}

export function getPlayers() {
  return players;
}