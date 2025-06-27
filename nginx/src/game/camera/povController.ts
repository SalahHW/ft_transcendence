import * as BABYLON from '@babylonjs/core';
import { FPSCamera } from './fpsCamera.js';
import { playerPaddle } from '../player/player.js';
import { LightingController } from './lightingController.js';

export interface CameraConfig {
    scene: BABYLON.Scene;
    canvas: HTMLCanvasElement;
    player1: playerPaddle;
    player2: playerPaddle;
    localPlayerId: string;
    playground: BABYLON.Mesh;
}

export enum CameraPerspective {
    TOP_DOWN = 'topDown',
    FPS_PLAYER1 = 'fpsPlayer1',
    FPS_PLAYER2 = 'fpsPlayer2'
}

export class POVController {
    private scene: BABYLON.Scene;
    private canvas: HTMLCanvasElement;
    private player1: playerPaddle;
    private player2: playerPaddle;
    private localPlayerId: string;
    
    private currentPerspective: CameraPerspective;
    private topDownCamera: BABYLON.UniversalCamera | null = null;
    private fpsCamera: FPSCamera | null = null;
    private activeCamera: BABYLON.Camera | null = null;
    private lightingController: LightingController;

    constructor(config: CameraConfig) {
        this.scene = config.scene;
        this.canvas = config.canvas;
        this.player1 = config.player1;
        this.player2 = config.player2;
        this.localPlayerId = config.localPlayerId;
        this.currentPerspective = CameraPerspective.TOP_DOWN;
        
        // Initialize lighting controller
        this.lightingController = new LightingController({
            scene: this.scene,
            playground: config.playground
        });
    }

    /**
     * Initialize the POV controller with the existing top-down camera and lighting
     */
    public initializeWithTopDownCamera(existingCamera: BABYLON.UniversalCamera): void {
        this.topDownCamera = existingCamera;
        this.activeCamera = existingCamera;
        this.scene.activeCamera = existingCamera;
    }

    /**
     * Capture original lighting setup from gameMap
     */
    public captureOriginalLighting(mainLight: BABYLON.DirectionalLight, ambientLight: BABYLON.HemisphericLight): void {
        this.lightingController.captureOriginalLighting(mainLight, ambientLight);
    }

    /**
     * Switch to FPS perspective for the local player
     */
    public switchToFPSPerspective(): void {
        console.log('🎮 Switching to FPS perspective for player:', this.localPlayerId);
        
        // Determine which player is the local player
        const isPlayer1 = this.player1.getPlayerId() === this.localPlayerId;
        const localPlayer = isPlayer1 ? this.player1 : this.player2;
        const opponentPlayer = isPlayer1 ? this.player2 : this.player1;
        
        // Create FPS camera if it doesn't exist
        if (!this.fpsCamera) {
            this.fpsCamera = new FPSCamera({
                scene: this.scene,
                canvas: this.canvas,
                localPlayer: localPlayer,
                opponentPlayer: opponentPlayer,
                isPlayer1: isPlayer1
            });
        }

        // Switch to FPS camera
        this.activeCamera = this.fpsCamera.getCamera();
        this.scene.activeCamera = this.activeCamera;
        
        // Update perspective state
        this.currentPerspective = isPlayer1 ? CameraPerspective.FPS_PLAYER1 : CameraPerspective.FPS_PLAYER2;
        
        // 🔆 Switch to FPS lighting
        this.lightingController.switchToFPSLighting();
        
        console.log('🎮 FPS camera activated for', isPlayer1 ? 'Player 1' : 'Player 2');
    }

    /**
     * Switch back to top-down perspective
     */
    public switchToTopDownPerspective(): void {
        if (this.topDownCamera) {
            this.activeCamera = this.topDownCamera;
            this.scene.activeCamera = this.topDownCamera;
            this.currentPerspective = CameraPerspective.TOP_DOWN;
            
            // 🔆 Switch back to top-down lighting
            this.lightingController.switchToTopDownLighting();
            
            console.log('🎮 Switched back to top-down perspective');
        }
    }

    /**
     * Update camera position (call this in the game loop)
     */
    public update(): void {
        if (this.fpsCamera && this.currentPerspective !== CameraPerspective.TOP_DOWN) {
            this.fpsCamera.update();
        }
    }

    /**
     * Get current perspective
     */
    public getCurrentPerspective(): CameraPerspective {
        return this.currentPerspective;
    }

    /**
     * Check if currently in FPS mode
     */
    public isInFPSMode(): boolean {
        return this.currentPerspective === CameraPerspective.FPS_PLAYER1 || 
               this.currentPerspective === CameraPerspective.FPS_PLAYER2;
    }

    /**
     * 🎮 Trigger FPS camera shake (FPS-only game)
     */
    public triggerCameraShake(): Promise<void> {
        if (this.fpsCamera) {
            // Use FPS camera's built-in shake method
            return this.fpsCamera.triggerShake();
        } else {
            // No camera available, return resolved promise
            return Promise.resolve();
        }
    }

    /**
     * Dispose of camera resources
     */
    public dispose(): void {
        if (this.fpsCamera) {
            this.fpsCamera.dispose();
            this.fpsCamera = null;
        }
        
        // Dispose lighting controller
        this.lightingController.dispose();
        
        // Don't dispose top-down camera as it's managed by gameMap
        this.activeCamera = null;
        this.topDownCamera = null;
    }
} 