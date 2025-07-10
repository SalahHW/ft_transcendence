/**
 * Tournament Asset Disposal Manager (Frontend)
 * Handles cleanup of Babylon.js game assets between tournament matches and at tournament end
 */

// Import types/interfaces as needed
// (Assume these are available in the codebase)
// import { Ball } from '../ball/ball';
// import { playerPaddle } from '../player/player';
// import { gameMap } from '../map/gameMap';
// import { PlayerPowerup } from '../player/playerPowerup';

export enum FrontendDisposalStates {
  IDLE = 'idle',
  DISPOSING = 'disposing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export type TournamentGameAssets = {
  ball?: any;
  player1?: any;
  player2?: any;
  map?: any;
  player1Powerup?: any;
  player2Powerup?: any;
  // Add more as needed
};

export class TournamentAssetDisposalManager {
  private disposalState: FrontendDisposalStates = FrontendDisposalStates.IDLE;
  private logs: string[] = [];

  /**
   * Dispose all assets between matches (but keep map if needed)
   */
  disposeBetweenMatches(assets: TournamentGameAssets) {
    this.log('Disposing assets between matches...');
    this.disposalState = FrontendDisposalStates.DISPOSING;
    try {
      this.disposeBall(assets.ball);
      this.disposePaddle(assets.player1);
      this.disposePaddle(assets.player2);
      this.disposePowerup(assets.player1Powerup);
      this.disposePowerup(assets.player2Powerup);
      // Optionally, keep map for performance
      this.log('Disposed ball, paddles, and powerups. Map kept.');
      this.disposalState = FrontendDisposalStates.COMPLETED;
    } catch (e) {
      this.log('Error during between-matches disposal: ' + e);
      this.disposalState = FrontendDisposalStates.ERROR;
    }
  }

  /**
   * Dispose all assets at tournament end (full cleanup)
   */
  disposeAtTournamentEnd(assets: TournamentGameAssets) {
    this.log('Disposing all assets at tournament end...');
    this.disposalState = FrontendDisposalStates.DISPOSING;
    try {
      this.disposeBall(assets.ball);
      this.disposePaddle(assets.player1);
      this.disposePaddle(assets.player2);
      this.disposePowerup(assets.player1Powerup);
      this.disposePowerup(assets.player2Powerup);
      this.disposeMap(assets.map);
      this.log('Disposed all assets including map.');
      this.disposalState = FrontendDisposalStates.COMPLETED;
    } catch (e) {
      this.log('Error during tournament end disposal: ' + e);
      this.disposalState = FrontendDisposalStates.ERROR;
    }
  }

  /**
   * Force disposal (emergency/cleanup)
   */
  forceDisposeAll(assets: TournamentGameAssets) {
    this.log('Force disposing all assets...');
    this.disposeAtTournamentEnd(assets);
  }

  /**
   * Dispose a ball and its resources
   */
  disposeBall(ball: any) {
    if (!ball) return;
    if (typeof ball.dispose === 'function') {
      ball.dispose();
      this.log('Ball disposed.');
    } else if (ball.ballBody && typeof ball.ballBody.dispose === 'function') {
      ball.ballBody.dispose();
      this.log('Ball mesh disposed.');
    }
    // Null references
    if ('ballBody' in ball) ball.ballBody = null;
    if ('ballMaterial' in ball) ball.ballMaterial = null;
    if ('ballTrail' in ball && ball.ballTrail && typeof ball.ballTrail.dispose === 'function') {
      ball.ballTrail.dispose();
      ball.ballTrail = null;
      this.log('Ball trail disposed.');
    }
    if ('ballPowerup' in ball && ball.ballPowerup && typeof ball.ballPowerup.dispose === 'function') {
      ball.ballPowerup.dispose();
      ball.ballPowerup = null;
      this.log('Ball powerup disposed.');
    }
  }

  /**
   * Dispose a paddle/player and its resources
   */
  disposePaddle(paddle: any) {
    if (!paddle) return;
    if (typeof paddle.dispose === 'function') {
      paddle.dispose();
      this.log('Paddle disposed.');
    } else if (paddle.paddleBody && typeof paddle.paddleBody.dispose === 'function') {
      paddle.paddleBody.dispose();
      this.log('Paddle mesh disposed.');
    }
    if ('paddleBody' in paddle) paddle.paddleBody = null;
  }

  /**
   * Dispose a powerup UI or system
   */
  disposePowerup(powerup: any) {
    if (!powerup) return;
    if (typeof powerup.dispose === 'function') {
      powerup.dispose();
      this.log('Powerup disposed.');
    }
  }

  /**
   * Dispose the map and its resources
   */
  disposeMap(map: any) {
    if (!map) return;
    if (typeof map.dispose === 'function') {
      map.dispose();
      this.log('Map disposed.');
    }
    // Null references
    if ('scene' in map) map.scene = null;
  }

  /**
   * Get current disposal state
   */
  getState() {
    return this.disposalState;
  }

  /**
   * Get disposal logs
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Log a message
   */
  private log(msg: string) {
    this.logs.push(`[${new Date().toISOString()}] ${msg}`);
    if (this.logs.length > 50) this.logs.shift();
    // Optionally, also console.log
    // console.log(msg);
  }
}

// Export singleton instance
export const frontendAssetDisposalManager = new TournamentAssetDisposalManager(); 