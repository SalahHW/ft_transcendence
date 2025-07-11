/**
 * Tournament Cleanup Manager
 * Handles inactivity cleanup and maintenance operations
 */

import { TournamentConfig } from '../constants.js';
import { transferLockManager } from '../playerManagement/TournamentTransferLockManager.js';
import { assetDisposalManager } from '../assetManagement/TournamentAssetDisposalManager.js';

export class TournamentCleanupManager {
  constructor(waitingRooms, disconnectHandler) {
    this.waitingRooms = waitingRooms;
    this.disconnectHandler = null; // Will be set dynamically
    this.cleanupInterval = null;
  }

  /**
   * Get disconnect handler dynamically to avoid circular dependencies
   */
  async getDisconnectHandler() {
    if (!this.disconnectHandler) {
      const { tournamentDisconnectHandler } = await import('../../server/disconnect/TournamentDisconnectHandler.js');
      this.disconnectHandler = tournamentDisconnectHandler;
    }
    return this.disconnectHandler;
  }

  /**
   * Start periodic cleanup of inactive players in waiting rooms
   */
  startInactivityCleanup() {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupInactivePlayers();
        // ⭐ NEW: Also check for stuck tournaments
        await this.forceCleanupStuckTournaments();
      } catch (error) {
        console.error('🏆 Error during tournament inactivity cleanup:', error);
      }
    }, TournamentConfig.CLEANUP_INTERVAL);
  }

  /**
   * Stop periodic cleanup
   */
  stopInactivityCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clean up inactive players from waiting rooms
   */
  async cleanupInactivePlayers() {
    const now = Date.now();
    const disconnectHandler = await this.getDisconnectHandler();
    
    for (const [waitingRoomId, waitingRoomData] of this.waitingRooms) {
      // Check for inactive players
      const inactivePlayers = waitingRoomData.players.filter(player => {
        const timeSinceJoin = now - player.joinedAt;
        return timeSinceJoin > TournamentConfig.INACTIVITY_THRESHOLD;
      });
      
      if (inactivePlayers.length > 0) {
        console.log(`🏆 Cleaning up ${inactivePlayers.length} inactive players from waiting room ${waitingRoomId}`);
        
        inactivePlayers.forEach(player => {
          console.log(`🏆 Removing inactive player ${player.username} (${player.id}) from waiting room ${waitingRoomId}`);
          disconnectHandler.handleWaitingRoomDisconnect(player.id, waitingRoomId, 'inactivity_timeout');
        });
      }
      
      // Check for duplicate usernames in the same waiting room
      const usernameCounts = {};
      waitingRoomData.players.forEach(player => {
        usernameCounts[player.username] = (usernameCounts[player.username] || 0) + 1;
      });
      
      const duplicateUsernames = Object.keys(usernameCounts).filter(username => usernameCounts[username] > 1);
      
      if (duplicateUsernames.length > 0) {
        console.log(`🏆 Found duplicate usernames in waiting room ${waitingRoomId}: ${duplicateUsernames.join(', ')}`);
        
        duplicateUsernames.forEach(username => {
          const duplicatePlayers = waitingRoomData.players.filter(p => p.username === username);
          // Keep the most recent player, remove the older ones
          const sortedPlayers = duplicatePlayers.sort((a, b) => b.joinedAt - a.joinedAt);
          const playersToRemove = sortedPlayers.slice(1); // Remove all but the most recent
          
          playersToRemove.forEach(player => {
            console.log(`🏆 Removing duplicate player ${player.username} (${player.id}) from waiting room ${waitingRoomId}`);
            disconnectHandler.handleWaitingRoomDisconnect(player.id, waitingRoomId, 'duplicate_username');
          });
        });
      }
    }
  }

  /**
   * Clean up a specific waiting room
   */
  async cleanupWaitingRoom(waitingRoomId) {
    console.log(`🏆 Cleaning up waiting room ${waitingRoomId}`);
    
    // Get waiting room data for asset disposal
    const waitingRoomData = this.waitingRooms.get(waitingRoomId);
    
    // Clean up transfer locks for this tournament
    transferLockManager.cleanupTournament(waitingRoomId);
    
    // Clean up all tournament assets
    if (waitingRoomData) {
      await assetDisposalManager.disposeAtTournamentEndWithData(waitingRoomId, waitingRoomData);
    } else {
      await assetDisposalManager.disposeAtTournamentEnd(waitingRoomId);
    }
    
    // Clean up tournament rooms
    const disconnectHandler = await this.getDisconnectHandler();
    disconnectHandler.cleanupTournamentRooms(waitingRoomId);
    
    console.log(`🏆 Tournament cleanup completed for ${waitingRoomId}`);
  }
  
  /**
   * ⭐ NEW: Force cleanup of stuck tournaments
   */
  async forceCleanupStuckTournaments() {
    console.log(`🏆 Checking for stuck tournaments...`);
    
    const now = Date.now();
    const stuckTournaments = [];
    
    for (const [waitingRoomId, waitingRoomData] of this.waitingRooms.entries()) {
      // Check if tournament has been running for more than 30 minutes
      const tournamentAge = now - waitingRoomData.createdAt;
      const maxTournamentAge = 30 * 60 * 1000; // 30 minutes
      
      if (tournamentAge > maxTournamentAge && waitingRoomData.phase !== 'FINISHED') {
        console.log(`🏆 Found stuck tournament ${waitingRoomId} (age: ${Math.round(tournamentAge / 1000)}s)`);
        stuckTournaments.push(waitingRoomId);
      }
    }
    
    // Clean up stuck tournaments
    for (const waitingRoomId of stuckTournaments) {
      console.log(`🏆 Force cleaning up stuck tournament ${waitingRoomId}`);
      await this.cleanupWaitingRoom(waitingRoomId);
    }
    
    if (stuckTournaments.length > 0) {
      console.log(`🏆 Force cleaned up ${stuckTournaments.length} stuck tournaments`);
    }
  }
} 