import { GAME_CONFIG, LOG_SEPARATORS } from '../core/constants.js';

// WebSocket Utilities
export class WebSocketUtils {
  /**
   * Check if WebSocket connection is open and ready
   */
  static isWebSocketReady(ws) {
    return ws && ws.readyState === GAME_CONFIG.WEBSOCKET_READY_STATE;
  }
  
  /**
   * Safely send JSON message through WebSocket
   */
  static sendJSON(ws, message) {
    if (!this.isWebSocketReady(ws)) {
      console.warn('Cannot send message: WebSocket not ready', { readyState: ws?.readyState });
      return false;
    }
    
    try {
      ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }
  
  /**
   * Filter array of players to only include those with active connections
   */
  static filterActiveConnections(players) {
    return players.filter(player => this.isWebSocketReady(player.ws));
  }
}

// Position and Movement Utilities
export class PositionUtils {
  /**
   * Clamp position to game boundaries
   */
  static clampToBoundary(position) {
    return Math.max(-GAME_CONFIG.PADDLE_BOUNDARY, Math.min(GAME_CONFIG.PADDLE_BOUNDARY, position));
  }
  
  /**
   * Validate movement distance based on time elapsed (anti-cheat)
   */
  static validateMovement(oldPosition, newPosition, deltaTime) {
    const maxMovement = GAME_CONFIG.PADDLE_SPEED * deltaTime;
    const actualMovement = Math.abs(newPosition - oldPosition);
    return actualMovement <= maxMovement + 0.01; // Small tolerance for floating point
  }
  
  /**
   * Calculate safe position update with bounds and speed checking
   */
  static calculateSafePosition(currentPos, targetPos, deltaTime) {
    const clampedTarget = this.clampToBoundary(targetPos);
    
    if (this.validateMovement(currentPos, clampedTarget, deltaTime)) {
      return Number(clampedTarget.toFixed(3));
    }
    
    return currentPos; // Return unchanged if movement is invalid
  }
}

// Validation Utilities
export class ValidationUtils {
  /**
   * Validate username according to game rules
   */
  static isValidUsername(username) {
    return typeof username === 'string' && 
           username.trim().length >= GAME_CONFIG.MIN_USERNAME_LENGTH &&
           username.trim().length <= GAME_CONFIG.MAX_USERNAME_LENGTH;
  }
  
  /**
   * Check if score qualifies for game win
   */
  static isWinningScore(score1, score2) {
    const maxScore = Math.max(score1, score2);
    const minScore = Math.min(score1, score2);
    
    return maxScore >= GAME_CONFIG.WINNING_SCORE && 
           (maxScore - minScore) >= GAME_CONFIG.MAX_SCORE_DIFFERENCE;
  }
  
  /**
   * Determine winner from scores
   */
  static determineWinner(score1, score2) {
    if (!this.isWinningScore(score1, score2)) {
      return null;
    }
    return score1 >= GAME_CONFIG.WINNING_SCORE ? 'player1' : 'player2';
  }
}

// Logging Utilities  
export class LogUtils {
  /**
   * Log section header with consistent formatting
   */
  static logSection(title) {
    console.log(LOG_SEPARATORS.SECTION);
    console.log(title.toUpperCase());
    console.log(LOG_SEPARATORS.SECTION);
  }
  
  /**
   * Log subsection with consistent formatting
   */
  static logSubsection(title) {
    console.log(title);
    console.log(LOG_SEPARATORS.SUBSECTION);
  }
  
  /**
   * Log match completion with detailed formatting
   */
  static logMatchCompletion(matchData) {
    this.logSection('MATCH COMPLETED');
    console.log(`Room ID: ${matchData.roomId}`);
    console.log(`Match End Time: ${matchData.matchEndTime}`);
    console.log(`Winner: ${matchData.winner.username || 'Anonymous'} (ID: ${matchData.winner.id}) - Score: ${matchData.winner.score}`);
    console.log(`Loser: ${matchData.loser.username || 'Anonymous'} (ID: ${matchData.loser.id}) - Score: ${matchData.loser.score}`);
    console.log(`Final Score: ${matchData.winner.score}-${matchData.loser.score}`);
    console.log(`Total Ball Rebounds: ${matchData.gameStats.totalRebounds}`);
    console.log(`Match Duration: ${matchData.matchDuration}ms`);
    console.log(LOG_SEPARATORS.SECTION);
  }
  
  /**
   * Log API packet with formatting
   */
  static logApiPacket(title, data) {
    console.log(` ********* ${title.toUpperCase()}: *********`);
    console.log(JSON.stringify(data, null, 2));
    console.log(LOG_SEPARATORS.SECTION);
  }
  
  /**
   * Log player connection/disconnection
   */
  static logPlayerAction(action, playerId, roomId, additional = '') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Player ${action}: ${playerId} in room ${roomId} ${additional}`);
  }
}

// Room Utilities
export class RoomUtils {
  /**
   * Check if room has exactly 2 players and is ready for game
   */
  static isRoomReadyForGame(room) {
    return room && 
           room.players && 
           room.players.length === 2 && 
           !room.isGameOver;
  }
  
  /**
   * Check if all players in room are ready to play
   */
  static areAllPlayersReady(room) {
    if (!this.isRoomReadyForGame(room)) return false;
    
    return room.players.every(player => 
      player.username && 
      WebSocketUtils.isWebSocketReady(player.ws) && 
      player.readyToPlay
    );
  }
  
  /**
   * Get opponent player in room
   */
  static getOpponent(room, playerId) {
    if (!this.isRoomReadyForGame(room)) return null;
    
    return room.players.find(player => player.id !== playerId);
  }
  
  /**
   * Get player by ID in room
   */
  static getPlayerInRoom(room, playerId) {
    if (!room || !room.players) return null;
    
    return room.players.find(player => player.id === playerId);
  }
}

// Time Utilities
export class TimeUtils {
  /**
   * Calculate match duration in milliseconds
   */
  static calculateMatchDuration(startTime, endTime = new Date()) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return end - start;
  }
  
  /**
   * Get current ISO timestamp
   */
  static getCurrentTimestamp() {
    return new Date().toISOString();
  }
  
  /**
   * Format duration in human readable format
   */
  static formatDuration(durationMs) {
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
} 