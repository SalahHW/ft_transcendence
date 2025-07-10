/**
 * Frontend Asset Disposal Manager
 * Handles disposal of Babylon.js game assets for tournament matches
 */

import * as BABYLON from '@babylonjs/core';

export class FrontendAssetDisposalManager {
  private static instance: FrontendAssetDisposalManager;
  private disposalQueue: Array<() => Promise<void>> = [];
  private isDisposing: boolean = false;
  private disposedAssets: Set<string> = new Set();

  private constructor() {}

  static getInstance(): FrontendAssetDisposalManager {
    if (!FrontendAssetDisposalManager.instance) {
      FrontendAssetDisposalManager.instance = new FrontendAssetDisposalManager();
    }
    return FrontendAssetDisposalManager.instance;
  }

  /**
   * Dispose game assets between tournament matches
   */
  async disposeBetweenMatches(gameAssets: {
    ball?: any;
    player1?: any;
    player2?: any;
    map?: any;
    scene?: BABYLON.Scene;
  }): Promise<void> {
    console.log('🧹 Frontend: Starting disposal between matches');
    
    const disposalTask = async () => {
      try {
        // Dispose ball and its effects
        if (gameAssets.ball) {
          await this.disposeBall(gameAssets.ball);
        }

        // Dispose player paddles
        if (gameAssets.player1) {
          await this.disposePlayer(gameAssets.player1, 'player1');
        }
        if (gameAssets.player2) {
          await this.disposePlayer(gameAssets.player2, 'player2');
        }

        // Dispose map elements (but keep scene)
        if (gameAssets.map) {
          await this.disposeMap(gameAssets.map);
        }

        // Clear any remaining meshes and materials
        if (gameAssets.scene) {
          await this.cleanupScene(gameAssets.scene);
        }

        console.log('🧹 Frontend: Disposal between matches completed');
      } catch (error) {
        console.error('🧹 Frontend: Error during disposal between matches:', error);
        throw error;
      }
    };

    await this.queueDisposal(disposalTask);
  }

  /**
   * Dispose all game assets at tournament end
   */
  async disposeAtTournamentEnd(gameAssets: {
    ball?: any;
    player1?: any;
    player2?: any;
    map?: any;
    scene?: BABYLON.Scene;
  }): Promise<void> {
    console.log('🧹 Frontend: Starting disposal at tournament end');
    
    const disposalTask = async () => {
      try {
        // Dispose all game objects
        if (gameAssets.ball) {
          await this.disposeBall(gameAssets.ball);
        }
        if (gameAssets.player1) {
          await this.disposePlayer(gameAssets.player1, 'player1');
        }
        if (gameAssets.player2) {
          await this.disposePlayer(gameAssets.player2, 'player2');
        }
        if (gameAssets.map) {
          await this.disposeMap(gameAssets.map);
        }

        // Full scene cleanup
        if (gameAssets.scene) {
          await this.cleanupScene(gameAssets.scene, true);
        }

        // Clear disposal tracking
        this.disposedAssets.clear();
        
        console.log('🧹 Frontend: Tournament end disposal completed');
      } catch (error) {
        console.error('🧹 Frontend: Error during tournament end disposal:', error);
        throw error;
      }
    };

    await this.queueDisposal(disposalTask);
  }

  /**
   * Force disposal of all assets (emergency cleanup)
   */
  async forceDisposal(gameAssets: {
    ball?: any;
    player1?: any;
    player2?: any;
    map?: any;
    scene?: BABYLON.Scene;
  }): Promise<void> {
    console.log('🧹 Frontend: Force disposal initiated');
    
    // Clear queue and dispose immediately
    this.disposalQueue = [];
    this.isDisposing = false;
    
    try {
      // Dispose everything without queuing
      if (gameAssets.ball) {
        await this.disposeBall(gameAssets.ball);
      }
      if (gameAssets.player1) {
        await this.disposePlayer(gameAssets.player1, 'player1');
      }
      if (gameAssets.player2) {
        await this.disposePlayer(gameAssets.player2, 'player2');
      }
      if (gameAssets.map) {
        await this.disposeMap(gameAssets.map);
      }
      if (gameAssets.scene) {
        await this.cleanupScene(gameAssets.scene, true);
      }

      this.disposedAssets.clear();
      console.log('🧹 Frontend: Force disposal completed');
    } catch (error) {
      console.error('🧹 Frontend: Error during force disposal:', error);
      throw error;
    }
  }

  /**
   * Dispose ball and its effects
   */
  private async disposeBall(ball: any): Promise<void> {
    if (!ball || this.disposedAssets.has('ball')) return;

    try {
      console.log('🧹 Frontend: Disposing ball');
      
      // Dispose ball body
      if (ball.ballBody && ball.ballBody.dispose) {
        ball.ballBody.dispose();
      }
      
      // Dispose ball trail effects
      if (ball.trail && ball.trail.dispose) {
        ball.trail.dispose();
      }
      
      // Dispose ball powerup effects
      if (ball.powerupEffects) {
        for (const effect of ball.powerupEffects) {
          if (effect && effect.dispose) {
            effect.dispose();
          }
        }
      }
      
      // Clear ball references
      ball.ballBody = null;
      ball.trail = null;
      ball.powerupEffects = null;
      
      this.disposedAssets.add('ball');
      console.log('🧹 Frontend: Ball disposed successfully');
    } catch (error) {
      console.error('🧹 Frontend: Error disposing ball:', error);
    }
  }

  /**
   * Dispose player paddle and effects
   */
  private async disposePlayer(player: any, playerId: string): Promise<void> {
    if (!player || this.disposedAssets.has(playerId)) return;

    try {
      console.log(`🧹 Frontend: Disposing ${playerId}`);
      
      // Dispose paddle body
      if (player.paddleBody && player.paddleBody.dispose) {
        player.paddleBody.dispose();
      }
      
      // Dispose player powerup effects
      if (player.powerupEffects) {
        for (const effect of player.powerupEffects) {
          if (effect && effect.dispose) {
            effect.dispose();
          }
        }
      }
      
      // Dispose player trail effects
      if (player.trail && player.trail.dispose) {
        player.trail.dispose();
      }
      
      // Clear player references
      player.paddleBody = null;
      player.powerupEffects = null;
      player.trail = null;
      
      this.disposedAssets.add(playerId);
      console.log(`🧹 Frontend: ${playerId} disposed successfully`);
    } catch (error) {
      console.error(`🧹 Frontend: Error disposing ${playerId}:`, error);
    }
  }

  /**
   * Dispose map elements
   */
  private async disposeMap(map: any): Promise<void> {
    if (!map || this.disposedAssets.has('map')) return;

    try {
      console.log('🧹 Frontend: Disposing map elements');
      
      // Dispose playground elements
      if (map.playground && map.playground.dispose) {
        map.playground.dispose();
      }
      
      // Dispose floor elements
      if (map.floor && map.floor.dispose) {
        map.floor.dispose();
      }
      
      // Dispose wall elements
      if (map.walls) {
        for (const wall of map.walls) {
          if (wall && wall.dispose) {
            wall.dispose();
          }
        }
      }
      
      // Clear map references
      map.playground = null;
      map.floor = null;
      map.walls = null;
      
      this.disposedAssets.add('map');
      console.log('🧹 Frontend: Map elements disposed successfully');
    } catch (error) {
      console.error('🧹 Frontend: Error disposing map elements:', error);
    }
  }

  /**
   * Cleanup scene (partial or full)
   */
  private async cleanupScene(scene: BABYLON.Scene, fullCleanup: boolean = false): Promise<void> {
    if (!scene) return;

    try {
      console.log(`🧹 Frontend: Cleaning scene (${fullCleanup ? 'full' : 'partial'})`);
      
      if (fullCleanup) {
        // Full cleanup - dispose all meshes and materials
        scene.meshes.forEach(mesh => {
          if (mesh && mesh.dispose) {
            mesh.dispose();
          }
        });
        
        scene.materials.forEach(material => {
          if (material && material.dispose) {
            material.dispose();
          }
        });
        
        scene.textures.forEach(texture => {
          if (texture && texture.dispose) {
            texture.dispose();
          }
        });
      } else {
        // Partial cleanup - only dispose game-specific meshes
        scene.meshes.forEach(mesh => {
          if (mesh && mesh.metadata && mesh.metadata.isGameAsset) {
            mesh.dispose();
          }
        });
      }
      
      console.log('🧹 Frontend: Scene cleanup completed');
    } catch (error) {
      console.error('🧹 Frontend: Error during scene cleanup:', error);
    }
  }

  /**
   * Queue disposal task to prevent concurrent disposals
   */
  private async queueDisposal(disposalTask: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.disposalQueue.push(async () => {
        try {
          await disposalTask();
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process disposal queue
   */
  private async processQueue(): Promise<void> {
    if (this.isDisposing || this.disposalQueue.length === 0) return;

    this.isDisposing = true;
    
    while (this.disposalQueue.length > 0) {
      const task = this.disposalQueue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('🧹 Frontend: Error in disposal queue:', error);
        }
      }
    }
    
    this.isDisposing = false;
  }

  /**
   * Get disposal status
   */
  getDisposalStatus(): {
    isDisposing: boolean;
    queueLength: number;
    disposedAssets: string[];
  } {
    return {
      isDisposing: this.isDisposing,
      queueLength: this.disposalQueue.length,
      disposedAssets: Array.from(this.disposedAssets)
    };
  }

  /**
   * Reset disposal manager state
   */
  reset(): void {
    this.disposalQueue = [];
    this.isDisposing = false;
    this.disposedAssets.clear();
    console.log('🧹 Frontend: Asset disposal manager reset');
  }
}

// Export singleton instance
export const frontendAssetDisposalManager = FrontendAssetDisposalManager.getInstance(); 