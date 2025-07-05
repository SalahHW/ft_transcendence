/**
 * Main entry point for disconnect handling system
 * Exports all disconnect-related components and provides unified interface
 */

import { gameStateManager } from '../../game/GameStateManager.js';
import { MatchTypes } from './BaseDisconnectHandler.js';
import { disconnectionDetector } from './DisconnectionDetector.js';

// Export base classes and constants
export { 
  BaseDisconnectHandler,
  PlayerStates,
  RoomStates,
  MatchTypes,
  DisconnectionReasons,
  WebSocketCloseCodes
} from './BaseDisconnectHandler.js';

// Export specific handlers
export { OneVOneDisconnectHandler, oneVOneDisconnectHandler } from './OneVOneDisconnectHandler.js';
export { TournamentDisconnectHandler, tournamentDisconnectHandler } from './TournamentDisconnectHandler.js';

// Export detector and router
export { DisconnectionDetector, disconnectionDetector } from './DisconnectionDetector.js';

// Main disconnect handler (for backward compatibility)
export const disconnectionHandler = disconnectionDetector;

// Utility functions for easy access
export function handlePlayerDisconnect(playerId, roomId, reason) {
  const room = gameStateManager.getRoom(roomId);
  if (!room) return;

  const matchType = room.matchType || MatchTypes.ONE_V_ONE;
  const handler = disconnectionDetector.getHandler(matchType);
  handler.handleDisconnection(playerId, roomId, reason);
}

export function handleExplicitLeave(playerId, roomId) {
  disconnectionDetector.handleExplicitLeave(playerId, roomId);
}

export function handlePlayerStateUpdate(playerId, roomId, state) {
  disconnectionDetector.handlePlayerStateUpdate(playerId, roomId, state);
}

export function handleBrowserEvent(playerId, roomId, eventType) {
  disconnectionDetector.handleBrowserEvent(playerId, roomId, eventType);
}

export function setupDisconnectDetection(ws, playerId, roomId) {
  disconnectionDetector.setupDisconnectDetection(ws, playerId, roomId);
}

export function getConnectionStats() {
  return disconnectionDetector.getConnectionStats();
}

export function cleanup() {
  disconnectionDetector.cleanup();
} 