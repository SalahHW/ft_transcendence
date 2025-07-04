import { roomManager } from './RoomManager.js';

/**
 * Handles matchmaking logic for finding or creating rooms
 */
export class RoomMatchmaker {
  constructor() {
    this.roomManager = roomManager;
    this.matchmakingQueue = new Map(); // playerId -> { player, preferences, timestamp }
  }

  /**
   * Find or create a room for a player
   */
  findOrCreateRoom(player, preferences = {}) {
    console.log(`**** Player ${player.id} (${player.username || 'Anonymous'}) - Joining 1v1 game`);
    
    // Regular 1v1 player logic
    let room = this._findSuitableRoom(player, preferences);
    
    if (!room) {
      // No suitable room found, create a new regular 1v1 room
      room = this.roomManager.createRoom(null, {
        maxPlayers: preferences.maxPlayers || 2,
        gameMode: preferences.gameMode || 'classic',
        metadata: {
          createdBy: player.id,
          preferences
        }
      });
    }

    // Add player to room
    const role = room.addPlayer(player);
    
    console.log(`Player ${player.id} assigned to room ${room.id} as role ${role}`);
    return {
      room,
      roomId: room.id,
      role
    };
  }

  /**
   * Add player to matchmaking queue
   */
  addToQueue(player, preferences = {}) {
    this.matchmakingQueue.set(player.id, {
      player,
      preferences,
      timestamp: Date.now()
    });
    
    console.log(`Player ${player.id} added to matchmaking queue`);
    return this._processQueue();
  }

  /**
   * Remove player from matchmaking queue
   */
  removeFromQueue(playerId) {
    const removed = this.matchmakingQueue.delete(playerId);
    if (removed) {
      console.log(`Player ${playerId} removed from matchmaking queue`);
    }
    return removed;
  }

  /**
   * Get queue status for a player
   */
  getQueueStatus(playerId) {
    const queueEntry = this.matchmakingQueue.get(playerId);
    if (!queueEntry) {
      return null;
    }

    return {
      playerId,
      position: this._getQueuePosition(playerId),
      waitTime: Date.now() - queueEntry.timestamp,
      queueSize: this.matchmakingQueue.size,
      estimatedWaitTime: this._estimateWaitTime(playerId)
    };
  }

  /**
   * Process the matchmaking queue
   */
  _processQueue() {
    const matches = [];
    const processed = new Set();

    for (const [playerId, queueEntry] of this.matchmakingQueue) {
      if (processed.has(playerId)) continue;

      const match = this._findMatchInQueue(queueEntry);
      if (match) {
        matches.push(match);
        processed.add(playerId);
        processed.add(match.opponent.player.id);
      }
    }

    // Create rooms for matches
    matches.forEach(match => {
      const room = this._createMatchRoom(match);
      this.removeFromQueue(match.requester.player.id);
      this.removeFromQueue(match.opponent.player.id);
      
      console.log(`Match created: ${match.requester.player.id} vs ${match.opponent.player.id} in room ${room.id}`);
    });

    return matches;
  }

  /**
   * Find a suitable existing room for a regular 1v1 player
   */
  _findSuitableRoom(player, preferences) {
    const availableRooms = this.roomManager.getAvailableRooms();
    
    // Filter rooms for 1v1 players
    const suitableRooms = availableRooms.filter(room => {
      // Check max players preference
      if (preferences.maxPlayers && room.maxPlayers !== preferences.maxPlayers) {
        return false;
      }
      
      // Check game mode preference
      if (preferences.gameMode && room.metadata?.gameMode !== preferences.gameMode) {
        return false;
      }
      
      // Check skill level preference (if implemented)
      if (preferences.skillLevel && room.metadata?.skillLevel !== preferences.skillLevel) {
        return false;
      }
      
      // Don't join rooms with players we've recently played against
      if (this._hasRecentMatch(player.id, room.players)) {
        return false;
      }

      return true;
    });

    // Sort by preference (e.g., by player count, creation time)
    suitableRooms.sort((a, b) => {
      // Prefer rooms with more players (closer to full)
      const playerCountDiff = b.players.length - a.players.length;
      if (playerCountDiff !== 0) return playerCountDiff;
      
      // Then prefer newer rooms
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return suitableRooms[0] || null;
  }

  /**
   * Find a match for a player in the queue
   */
  _findMatchInQueue(requesterEntry) {
    const { player: requester, preferences: requesterPrefs } = requesterEntry;

    for (const [opponentId, opponentEntry] of this.matchmakingQueue) {
      if (opponentId === requester.id) continue;

      const { player: opponent, preferences: opponentPrefs } = opponentEntry;
      
      // Check if preferences are compatible
      if (this._arePreferencesCompatible(requesterPrefs, opponentPrefs)) {
        return {
          requester: requesterEntry,
          opponent: opponentEntry,
          compatibility: this._calculateCompatibility(requesterPrefs, opponentPrefs)
        };
      }
    }

    return null;
  }

  /**
   * Check if two sets of preferences are compatible
   */
  _arePreferencesCompatible(prefs1, prefs2) {
    // Max players must match
    const maxPlayers1 = prefs1.maxPlayers || 2;
    const maxPlayers2 = prefs2.maxPlayers || 2;
    if (maxPlayers1 !== maxPlayers2) return false;

    // Game mode must match
    const gameMode1 = prefs1.gameMode || 'classic';
    const gameMode2 = prefs2.gameMode || 'classic';
    if (gameMode1 !== gameMode2) return false;

    // Skill level should be similar (if specified)
    if (prefs1.skillLevel && prefs2.skillLevel) {
      const skillDiff = Math.abs(prefs1.skillLevel - prefs2.skillLevel);
      if (skillDiff > 2) return false; // Allow up to 2 levels difference
    }

    return true;
  }

  /**
   * Calculate compatibility score between preferences
   */
  _calculateCompatibility(prefs1, prefs2) {
    let score = 100;

    // Skill level proximity
    if (prefs1.skillLevel && prefs2.skillLevel) {
      const skillDiff = Math.abs(prefs1.skillLevel - prefs2.skillLevel);
      score -= skillDiff * 10;
    }

    // Region preference
    if (prefs1.region && prefs2.region && prefs1.region === prefs2.region) {
      score += 20;
    }

    return Math.max(0, score);
  }

  /**
   * Create a room for a matched pair
   */
  _createMatchRoom(match) {
    const { requester, opponent } = match;
    
    // Merge preferences (requester takes priority)
    const roomOptions = {
      maxPlayers: requester.preferences.maxPlayers || 2,
      gameMode: requester.preferences.gameMode || 'classic',
      metadata: {
        matchType: 'matchmade',
        compatibility: match.compatibility,
        players: [requester.player.id, opponent.player.id]
      }
    };

    const room = this.roomManager.createRoom(null, roomOptions);
    
    // Add both players
    room.addPlayer(requester.player);
    room.addPlayer(opponent.player);
    
    return room;
  }

  /**
   * Check if player has recent match with any room players
   */
  _hasRecentMatch(playerId, roomPlayers) {
    // Simple implementation - could be enhanced with match history
    return false; // For now, allow all matches
  }

  /**
   * Get queue position for a player
   */
  _getQueuePosition(playerId) {
    const entries = Array.from(this.matchmakingQueue.entries());
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    return entries.findIndex(([id]) => id === playerId) + 1;
  }

  /**
   * Estimate wait time for a player
   */
  _estimateWaitTime(playerId) {
    const queueEntry = this.matchmakingQueue.get(playerId);
    if (!queueEntry) return 0;

    const position = this._getQueuePosition(playerId);
    const averageMatchTime = 30000; // 30 seconds average
    
    return Math.max(0, (position - 1) * averageMatchTime / 2);
  }

  /**
   * Get matchmaking statistics
   */
  getMatchmakingStats() {
    const queueEntries = Array.from(this.matchmakingQueue.values());
    const waitTimes = queueEntries.map(entry => Date.now() - entry.timestamp);
    
    return {
      queueSize: this.matchmakingQueue.size,
      averageWaitTime: waitTimes.length > 0 ? 
        waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length : 0,
      maxWaitTime: Math.max(...waitTimes, 0),
      activeMatches: this.roomManager.getActiveRooms().length,
      totalRooms: this.roomManager.getAllRooms().length
    };
  }

  /**
   * Clean up expired queue entries
   */
  cleanupExpiredQueue(maxWaitTime = 5 * 60 * 1000) { // 5 minutes
    const now = Date.now();
    const expiredPlayers = [];

    for (const [playerId, entry] of this.matchmakingQueue) {
      if (now - entry.timestamp > maxWaitTime) {
        expiredPlayers.push(playerId);
      }
    }

    expiredPlayers.forEach(playerId => {
      this.removeFromQueue(playerId);
      console.log(`Removed expired player ${playerId} from queue`);
    });

    return expiredPlayers.length;
  }

  /**
   * Force match creation (bypass normal matching rules)
   */
  forceMatch(playerIds) {
    if (playerIds.length !== 2) {
      throw new Error('Force match requires exactly 2 players');
    }

    const [player1Id, player2Id] = playerIds;
    const entry1 = this.matchmakingQueue.get(player1Id);
    const entry2 = this.matchmakingQueue.get(player2Id);

    if (!entry1 || !entry2) {
      throw new Error('One or both players not found in queue');
    }

    const match = {
      requester: entry1,
      opponent: entry2,
      compatibility: 100,
      forced: true
    };

    const room = this._createMatchRoom(match);
    this.removeFromQueue(player1Id);
    this.removeFromQueue(player2Id);

    console.log(`Forced match created: ${player1Id} vs ${player2Id} in room ${room.id}`);
    return room;
  }
}

// Create singleton instance
export const roomMatchmaker = new RoomMatchmaker(); 