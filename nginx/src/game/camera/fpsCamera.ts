import * as BABYLON from '@babylonjs/core';
import { playerPaddle } from '../player/player.js';

export interface FPSCameraConfig {
    scene: BABYLON.Scene;
    canvas: HTMLCanvasElement;
    localPlayer: playerPaddle;
    opponentPlayer: playerPaddle;
    isPlayer1: boolean;
}

export class FPSCamera {
    private scene: BABYLON.Scene;
    private canvas: HTMLCanvasElement;
    private localPlayer: playerPaddle;
    private opponentPlayer: playerPaddle;
    private isPlayer1: boolean;
    
    private camera!: BABYLON.UniversalCamera;
    private cameraOffset!: BABYLON.Vector3;
    private targetOffset!: BABYLON.Vector3;
    private fixedCameraPosition!: BABYLON.Vector3; // Fixed X and Y position
    private fixedTargetPosition!: BABYLON.Vector3; // Fixed target position

    constructor(config: FPSCameraConfig) {
        this.scene = config.scene;
        this.canvas = config.canvas;
        this.localPlayer = config.localPlayer;
        this.opponentPlayer = config.opponentPlayer;
        this.isPlayer1 = config.isPlayer1;
        
        this.setupCameraOffsets();
        this.createFPSCamera();
    }

    /**
     * Setup camera and target positions based on player position (stable positioning)
     */
    private setupCameraOffsets(): void {
        if (this.isPlayer1) {
            // Player 1 is on the right side (X: +19.5), looking left
            // Fixed camera position (doesn't move with paddle)
            this.fixedCameraPosition = new BABYLON.Vector3(22.5, 6, 0); // Behind paddle, stable
            this.fixedTargetPosition = new BABYLON.Vector3(0, 2, 0); // Look at center field
        } else {
            // Player 2 is on the left side (X: -19.5), looking right  
            // Fixed camera position (doesn't move with paddle)
            this.fixedCameraPosition = new BABYLON.Vector3(-22.5, 6, 0); // Behind paddle, stable
            this.fixedTargetPosition = new BABYLON.Vector3(0, 2, 0); // Look at center field
        }
        
        // Z offset to maintain relative positioning to paddle
        this.cameraOffset = new BABYLON.Vector3(0, 0, 0); // No offset from paddle center in Z
        this.targetOffset = new BABYLON.Vector3(0, 0, 0);
    }

    /**
     * Create and configure the FPS camera
     */
    private createFPSCamera(): void {
        // Use fixed camera position for stability
        const initialPosition = this.fixedCameraPosition.clone();
        
        // Create camera
        this.camera = new BABYLON.UniversalCamera(
            `fpsCamera_${this.isPlayer1 ? 'P1' : 'P2'}`,
            initialPosition,
            this.scene
        );

        // Configure camera
        this.configureCameraSettings();
        this.updateCameraTarget();
        
        console.log(`🎮 Stable FPS Camera created for ${this.isPlayer1 ? 'Player 1' : 'Player 2'} at position:`, initialPosition);
    }

    /**
     * Configure camera settings for FPS experience
     */
    private configureCameraSettings(): void {
        // Attach controls but disable mouse input for now (we want controlled movement)
        this.camera.attachControl(this.canvas, false);
        
        // Remove all default input controls
        this.camera.inputs.removeMouse();
        this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
        
        // Set field of view for good game visibility
        this.camera.fov = Math.PI / 3; // 60 degrees
        
        // Set camera limits
        this.camera.minZ = 0.1;
        this.camera.maxZ = 1000;
    }

    /**
     * Update camera target (stable - always looks at center field)
     */
    private updateCameraTarget(): void {
        // Use fixed target position for stability
        this.camera.setTarget(this.fixedTargetPosition);
    }

    /**
     * Get current paddle position
     */
    private getPaddlePosition(): BABYLON.Vector3 {
        const paddleBody = this.localPlayer.getPaddleBody;
        if (paddleBody && paddleBody.position) {
            return paddleBody.position.clone();
        }
        
        // Fallback to default position based on player
        const defaultX = this.isPlayer1 ? 19.5 : -19.5;
        return new BABYLON.Vector3(defaultX, 2, 0);
    }

    /**
     * Update camera position (stable - only follows paddle Z movement with fixed offset)
     */
    public update(): void {
        const paddlePosition = this.getPaddlePosition();
        
        // Calculate target Z position relative to paddle center
        // Keep camera at the same Z as paddle center (no offset)
        const currentPosition = this.camera.position;
        const targetZ = paddlePosition.z + this.cameraOffset.z; // Paddle center + any Z offset
        
        // Smoothly interpolate only the Z position to maintain alignment with paddle
        this.camera.position.z = BABYLON.Scalar.Lerp(
            currentPosition.z,
            targetZ,
            0.2 // Slightly more responsive for better paddle tracking
        );
        
        // Keep X and Y positions stable (user's preferred positioning)
        this.camera.position.x = this.fixedCameraPosition.x;
        this.camera.position.y = this.fixedCameraPosition.y;
        
        // Target remains fixed (no need to update every frame)
    }

    /**
     * Get the camera instance
     */
    public getCamera(): BABYLON.UniversalCamera {
        return this.camera;
    }

    /**
     * Adjust camera field of view
     */
    public setFieldOfView(fov: number): void {
        this.camera.fov = fov;
    }

    /**
     * Adjust camera follow smoothness
     */
    public setCameraOffset(offset: BABYLON.Vector3): void {
        this.cameraOffset = offset;
    }

    /**
     * Set fixed camera position (for fine-tuning)
     */
    public setFixedCameraPosition(position: BABYLON.Vector3): void {
        this.fixedCameraPosition = position.clone();
        this.camera.position.x = position.x;
        this.camera.position.y = position.y;
        // Z will be updated by paddle movement
    }

    /**
     * Set fixed target position (for fine-tuning)
     */
    public setFixedTargetPosition(target: BABYLON.Vector3): void {
        this.fixedTargetPosition = target.clone();
        this.camera.setTarget(target);
    }

    /**
     * Set Z offset relative to paddle (for perfect alignment)
     */
    public setZOffset(zOffset: number): void {
        this.cameraOffset.z = zOffset;
        console.log(`🎮 Camera Z offset set to ${zOffset} for better paddle alignment`);
    }

    /**
     * Get current paddle Z position for debugging
     */
    public getPaddleZ(): number {
        const paddlePosition = this.getPaddlePosition();
        return paddlePosition.z;
    }

    /**
     * Get current camera Z position for debugging
     */
    public getCameraZ(): number {
        return this.camera.position.z;
    }

    /**
     * Get current camera position for debugging
     */
    public getCameraPosition(): BABYLON.Vector3 {
        return this.camera.position.clone();
    }

    /**
     * Get current target position for debugging
     */
    public getTargetPosition(): BABYLON.Vector3 {
        return this.fixedTargetPosition.clone();
    }

    /**
     * Dispose camera resources
     */
    public dispose(): void {
        if (this.camera) {
            this.camera.dispose();
        }
    }
} 