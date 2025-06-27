import { POVController, CameraConfig, CameraPerspective } from './povController.js';
import { gameMap } from '../map/gameMap.js';
import { playerPaddle } from '../player/player.js';
import * as BABYLON from '@babylonjs/core';

/**
 * Camera Manager - Integrates POV switching with the existing game system
 */
export class CameraManager {
    private povController: POVController | null = null;
    private gameMap: gameMap | null = null;

    /**
     * Initialize camera management after game elements are created
     */
    public initialize(
        gameMapInstance: gameMap, 
        player1: playerPaddle, 
        player2: playerPaddle, 
        localPlayerId: string
    ): void {
        if (!gameMapInstance.getScene || !gameMapInstance.canvas) {
            console.error('🎮 Cannot initialize camera manager: missing scene or canvas');
            return;
        }

        this.gameMap = gameMapInstance;

        const config: CameraConfig = {
            scene: gameMapInstance.getScene,
            canvas: gameMapInstance.canvas,
            player1: player1,
            player2: player2,
            localPlayerId: localPlayerId,
            playground: gameMapInstance.getPlayground!
        };

        this.povController = new POVController(config);
        
        // Initialize with the existing top-down camera
        if (gameMapInstance.globalPov) {
            this.povController.initializeWithTopDownCamera(gameMapInstance.globalPov);
        }

        // Capture original lighting from gameMap
        if (gameMapInstance.light) {
            // Find ambient light - it should be a HemisphericLight
            const ambientLight = gameMapInstance.getScene.lights.find(light => 
                light instanceof BABYLON.HemisphericLight
            ) as BABYLON.HemisphericLight;

            if (ambientLight) {
                this.povController.captureOriginalLighting(gameMapInstance.light, ambientLight);
            }
        }

        console.log('🎮 Camera Manager initialized');
    }

    /**
     * Switch to FPS perspective after launch animation completes
     */
    public switchToFPSAfterAnimation(): void {
        if (!this.povController) {
            console.warn('🎮 Cannot switch to FPS: POV controller not initialized');
            return;
        }

        console.log('🎮 Switching to FPS perspective after animation');
        this.povController.switchToFPSPerspective();
    }

    /**
     * Switch back to top-down view
     */
    public switchToTopDown(): void {
        if (!this.povController) {
            console.warn('🎮 Cannot switch to top-down: POV controller not initialized');
            return;
        }

        this.povController.switchToTopDownPerspective();
    }

    /**
     * Update camera (call this in game loop)
     */
    public update(): void {
        if (this.povController) {
            this.povController.update();
        }
    }

    /**
     * Check if currently in FPS mode
     */
    public isInFPSMode(): boolean {
        return this.povController ? this.povController.isInFPSMode() : false;
    }

    /**
     * Get current perspective
     */
    public getCurrentPerspective(): CameraPerspective {
        return this.povController ? this.povController.getCurrentPerspective() : CameraPerspective.TOP_DOWN;
    }

    /**
     * Toggle between FPS and top-down (for testing/debugging)
     */
    public togglePerspective(): void {
        if (!this.povController) return;

        if (this.povController.isInFPSMode()) {
            this.switchToTopDown();
        } else {
            this.switchToFPSAfterAnimation();
        }
    }

    /**
     * Check if the local player should have inverted controls in FPS mode
     * Player2 (left side, looking right) needs inverted controls
     */
    public shouldInvertControls(): boolean {
        if (!this.povController || !this.povController.isInFPSMode()) {
            return false; // No inversion in top-down mode
        }
        
        // In FPS mode, Player2 (left side, looking right) needs inverted controls
        // because their left/right is opposite to the field coordinates
        return this.povController.getCurrentPerspective() === CameraPerspective.FPS_PLAYER2;
    }

    /**
     * Dispose camera resources
     */
    public dispose(): void {
        if (this.povController) {
            this.povController.dispose();
            this.povController = null;
        }
        this.gameMap = null;
    }
}

// Export a singleton instance
export const cameraManager = new CameraManager(); 