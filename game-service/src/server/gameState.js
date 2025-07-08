import { gameStateManager } from '../game/GameStateManager.js';
import { gameEngine } from '../game/GameEngine.js';

export function checkRoomReady(roomId) {
  return gameEngine.checkRoomReady(roomId);
}

export function sendBallUpdate(roomId) {
  return gameEngine.sendBallUpdate(roomId);
}

export function sendBallUpdateForced(roomId) {
  return gameEngine.sendBallUpdateForced(roomId);
}

export function broadcastToRoom(roomId, message) {
  return gameEngine.broadcastToRoom(roomId, message);
}

export async function endGame(room, roomId) {
  return gameEngine.endGame(room, roomId);
}

export async function createOrJoinRoom(playerId, player, ws) {
  return await gameEngine.createOrJoinRoom(playerId, player, ws);
}

export function getGameState() {
  return gameStateManager.getGameState();
}

export function getPlayers() {
  return gameStateManager.getPlayers();
}

export function setPlayerReady(playerId) {
  const roomId = gameStateManager.setPlayerReady(playerId);
  if (roomId && typeof roomId === 'string') {
    // Check if room is ready after setting player ready
    gameEngine.checkRoomReady(roomId);
  }
  return roomId;
}