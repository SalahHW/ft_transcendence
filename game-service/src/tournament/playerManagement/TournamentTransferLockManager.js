/**
 * Tournament Transfer Lock Manager
 * Handles locking mechanism for tournament player transfers to prevent race conditions
 */

import { gameStateManager } from '../../game/GameStateManager.js';

/**
 * Transfer lock states
 */
export const TransferLockStates = {
  IDLE: 'idle',
  TRANSFERRING: 'transferring',
  VERIFYING: 'verifying',
  ERROR: 'error'
};

/**
 * Transfer operation types
 */
export const TransferOperations = {
  SEMI_FINAL_TO_FINAL: 'semi_final_to_final',
  WAITING_TO_SEMI_FINAL: 'waiting_to_semi_final'
};

/**
 * Tournament Transfer Lock Manager
 */
export class TournamentTransferLockManager {
  constructor() {
    this.transferLocks = new Map(); // waitingRoomId -> lock state
    this.transferQueue = new Map(); // waitingRoomId -> array of pending transfers
    this.lockTimeouts = new Map(); // waitingRoomId -> timeout reference
    this.transferLogs = new Map(); // waitingRoomId -> array of transfer logs
    
    // Lock configuration
    this.LOCK_TIMEOUT_MS = 30000; // 30 seconds
    this.VERIFICATION_TIMEOUT_MS = 5000; // 5 seconds
  }

  /**
   * Acquire transfer lock for a tournament
   */
  async acquireLock(waitingRoomId, operationType, operationData = {}) {
    console.log(`🔒 Attempting to acquire transfer lock for tournament ${waitingRoomId}, operation: ${operationType}`);
    
    // Check if lock already exists
    if (this.transferLocks.has(waitingRoomId)) {
      const currentLock = this.transferLocks.get(waitingRoomId);
      
      if (currentLock.state === TransferLockStates.IDLE) {
        // Lock is available, acquire it
        return this._acquireAvailableLock(waitingRoomId, operationType, operationData);
      } else {
        // Lock is busy, queue the operation
        return this._queueTransfer(waitingRoomId, operationType, operationData);
      }
    } else {
      // No lock exists, create and acquire it
      return this._acquireAvailableLock(waitingRoomId, operationType, operationData);
    }
  }

  /**
   * Release transfer lock for a tournament
   */
  releaseLock(waitingRoomId, success = true) {
    console.log(`🔓 Releasing transfer lock for tournament ${waitingRoomId}, success: ${success}`);
    
    const lock = this.transferLocks.get(waitingRoomId);
    if (!lock) {
      console.warn(`🔓 No lock found for tournament ${waitingRoomId}`);
      return;
    }

    // Clear timeout
    if (this.lockTimeouts.has(waitingRoomId)) {
      clearTimeout(this.lockTimeouts.get(waitingRoomId));
      this.lockTimeouts.delete(waitingRoomId);
    }

    // Log the operation completion
    this._logTransfer(waitingRoomId, {
      operation: lock.currentOperation,
      state: success ? 'completed' : 'failed',
      timestamp: Date.now(),
      duration: Date.now() - lock.acquiredAt
    });

    if (success) {
      // Check if there are queued operations
      const queue = this.transferQueue.get(waitingRoomId) || [];
      if (queue.length > 0) {
        // Process next queued operation
        const nextOperation = queue.shift();
        this.transferQueue.set(waitingRoomId, queue);
        
        console.log(`🔒 Processing queued operation for tournament ${waitingRoomId}`);
        this._processQueuedOperation(waitingRoomId, nextOperation);
      } else {
        // No queued operations, set lock to idle
        lock.state = TransferLockStates.IDLE;
        lock.currentOperation = null;
        lock.acquiredAt = null;
        console.log(`🔒 Lock set to idle for tournament ${waitingRoomId}`);
      }
    } else {
      // Transfer failed, set lock to error state
      lock.state = TransferLockStates.ERROR;
      console.error(`🔒 Lock set to error state for tournament ${waitingRoomId}`);
      
      // Clear queue on error
      this.transferQueue.delete(waitingRoomId);
    }
  }

  /**
   * Verify transfer completion
   */
  async verifyTransfer(waitingRoomId, verificationCallback) {
    console.log(`🔍 Verifying transfer for tournament ${waitingRoomId}`);
    
    const lock = this.transferLocks.get(waitingRoomId);
    if (!lock) {
      console.error(`🔍 No lock found for verification in tournament ${waitingRoomId}`);
      return false;
    }

    lock.state = TransferLockStates.VERIFYING;
    
    try {
      // Set verification timeout
      const verificationPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Verification timeout'));
        }, this.VERIFICATION_TIMEOUT_MS);
        
        verificationCallback().then(() => {
          clearTimeout(timeout);
          resolve(true);
        }).catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      const result = await verificationPromise;
      console.log(`🔍 Transfer verification successful for tournament ${waitingRoomId}`);
      return result;
    } catch (error) {
      console.error(`🔍 Transfer verification failed for tournament ${waitingRoomId}:`, error);
      return false;
    }
  }

  /**
   * Get lock status for a tournament
   */
  getLockStatus(waitingRoomId) {
    const lock = this.transferLocks.get(waitingRoomId);
    const queue = this.transferQueue.get(waitingRoomId) || [];
    
    return {
      hasLock: !!lock,
      state: lock ? lock.state : TransferLockStates.IDLE,
      currentOperation: lock ? lock.currentOperation : null,
      acquiredAt: lock ? lock.acquiredAt : null,
      queueLength: queue.length,
      queuedOperations: queue.map(op => op.type)
    };
  }

  /**
   * Get transfer logs for a tournament
   */
  getTransferLogs(waitingRoomId) {
    return this.transferLogs.get(waitingRoomId) || [];
  }

  /**
   * Force release lock (for error recovery)
   */
  forceReleaseLock(waitingRoomId) {
    console.warn(`⚠️ Force releasing lock for tournament ${waitingRoomId}`);
    
    // Clear timeout
    if (this.lockTimeouts.has(waitingRoomId)) {
      clearTimeout(this.lockTimeouts.get(waitingRoomId));
      this.lockTimeouts.delete(waitingRoomId);
    }

    // Reset lock to idle
    const lock = this.transferLocks.get(waitingRoomId);
    if (lock) {
      lock.state = TransferLockStates.IDLE;
      lock.currentOperation = null;
      lock.acquiredAt = null;
    }

    // Clear queue
    this.transferQueue.delete(waitingRoomId);
    
    console.log(`⚠️ Lock force released for tournament ${waitingRoomId}`);
  }

  /**
   * Clean up locks for a tournament (called when tournament ends)
   */
  cleanupTournament(waitingRoomId) {
    
    if (this.lockTimeouts.has(waitingRoomId)) {
      clearTimeout(this.lockTimeouts.get(waitingRoomId));
      this.lockTimeouts.delete(waitingRoomId);
    }

    // Remove lock and queue
    this.transferLocks.delete(waitingRoomId);
    this.transferQueue.delete(waitingRoomId);
    
    // Keep logs for debugging (they'll be cleaned up by garbage collection)
    console.log(`🧹 Transfer locks cleaned up for tournament ${waitingRoomId}`);
  }

  /**
   * Acquire an available lock
   */
  _acquireAvailableLock(waitingRoomId, operationType, operationData) {
    const lock = {
      state: TransferLockStates.TRANSFERRING,
      currentOperation: operationType,
      acquiredAt: Date.now(),
      operationData
    };

    this.transferLocks.set(waitingRoomId, lock);
    
    // Set lock timeout
    const timeout = setTimeout(() => {
      console.error(`⏰ Transfer lock timeout for tournament ${waitingRoomId}`);
      this.forceReleaseLock(waitingRoomId);
    }, this.LOCK_TIMEOUT_MS);
    
    this.lockTimeouts.set(waitingRoomId, timeout);
    
    // Log the operation start
    this._logTransfer(waitingRoomId, {
      operation: operationType,
      state: 'started',
      timestamp: Date.now(),
      data: operationData
    });
    
    console.log(`🔒 Transfer lock acquired for tournament ${waitingRoomId}, operation: ${operationType}`);
    return true;
  }

  /**
   * Queue a transfer operation
   */
  _queueTransfer(waitingRoomId, operationType, operationData) {
    if (!this.transferQueue.has(waitingRoomId)) {
      this.transferQueue.set(waitingRoomId, []);
    }
    
    const queue = this.transferQueue.get(waitingRoomId);
    queue.push({
      type: operationType,
      data: operationData,
      timestamp: Date.now()
    });
    
    console.log(`📋 Queued transfer operation for tournament ${waitingRoomId}, operation: ${operationType}, queue length: ${queue.length}`);
    return false; // Lock not acquired
  }

  /**
   * Process a queued operation
   */
  _processQueuedOperation(waitingRoomId, operation) {
    this._acquireAvailableLock(waitingRoomId, operation.type, operation.data);
  }

  /**
   * Log transfer operation
   */
  _logTransfer(waitingRoomId, logEntry) {
    if (!this.transferLogs.has(waitingRoomId)) {
      this.transferLogs.set(waitingRoomId, []);
    }
    
    const logs = this.transferLogs.get(waitingRoomId);
    logs.push(logEntry);
    
    // Keep only last 50 logs
    if (logs.length > 50) {
      logs.splice(0, logs.length - 50);
    }
  }
}

// Create singleton instance
export const transferLockManager = new TournamentTransferLockManager(); 