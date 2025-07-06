/**
 * Tournament Cleanup Manager
 * Handles inactivity cleanup and maintenance operations
 */

import { TournamentConfig } from '../constants.js';
import { transferLockManager } from '../playerManagement/TournamentTransferLockManager.js';
import { assetDisposalManager } from '../assetManagement/TournamentAssetDisposalManager.js';
import { tournamentDisconnectHandler } from '../../server/disconnect/TournamentDisconnectHandler.js';

export class TournamentCleanupManager {
  constructor(waitingRooms, disconnectHandler) {
    this.waitingRooms = waitingRooms;
    this.disconnectHandler = tournamentDisconnectHandler;
    this.cleanupInterval = null;
  }

  /**
   * Start periodic cleanup of inactive players in waiting rooms
   */
  startInactivityCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactivePlayers();
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
  cleanupInactivePlayers() {
    const now = Date.now();
    
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
          this.disconnectHandler.handleWaitingRoomDisconnect(player.id, waitingRoomId, 'inactivity_timeout');
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
            this.disconnectHandler.handleWaitingRoomDisconnect(player.id, waitingRoomId, 'duplicate_username');
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
    this.disconnectHandler.cleanupTournamentRooms(waitingRoomId);
  }
} 