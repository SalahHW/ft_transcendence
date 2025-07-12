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

    // 🎮 Shake state
    private isShaking: boolean = false;
    private shakeStartTime: number = 0;
    private shakeDuration: number = 0;
    private shakeIntensity: number = 0;
    private originalShakePosition!: BABYLON.Vector3;
    private originalShakeTarget!: BABYLON.Vector3;

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
            this.fixedCameraPosition = new BABYLON.Vector3(19, 3, 0); // Behind paddle, stable
            this.fixedTargetPosition = new BABYLON.Vector3(0, 2, 0); // Look at center field
        } else {
            this.fixedCameraPosition = new BABYLON.Vector3(-19, 3, 0); // Behind paddle, stable
            this.fixedTargetPosition = new BABYLON.Vector3(0, 2, 0); // Look at center field
        }
        this.cameraOffset = new BABYLON.Vector3(0, 0, 0); // No offset from paddle center in Z
        this.targetOffset = new BABYLON.Vector3(0, 0, 0);
    }

    /**
     * Create and configure the FPS camera
     */
    private createFPSCamera(): void {
        const initialPosition = this.fixedCameraPosition.clone();
        this.camera = new BABYLON.UniversalCamera(
            `fpsCamera_${this.isPlayer1 ? 'P1' : 'P2'}`,
            initialPosition,
            this.scene
        );
        this.configureCameraSettings();
        this.updateCameraTarget();
        

    }

    /**
     * Configure camera settings for FPS experience
     */
    private configureCameraSettings(): void {
        // Attach controls but disable mouse input for now (we want controlled movement)
        this.camera.attachControl(this.canvas, false);
        this.camera.inputs.removeMouse();
        this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
        this.camera.fov = 110 * Math.PI / 180; // 110 degrees
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
        
        // 🎮 Only update X and Y if not shaking (to avoid fighting with shake effects)
        if (!this.isShaking) {
            // Keep X and Y positions stable (user's preferred positioning)
            this.camera.position.x = this.fixedCameraPosition.x;
            this.camera.position.y = this.fixedCameraPosition.y;
        } else {
            // Handle shake animation
            this.updateShake();
        }
        
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
     * 🎮 Trigger camera shake for FPS view
     */
    public triggerShake(duration: number = 400, intensity: number = 1.5): Promise<void> {
        return new Promise((resolve) => {
            try {
        
                
                this.isShaking = true;
                this.shakeStartTime = Date.now();
                this.shakeDuration = duration;
                this.shakeIntensity = intensity;
                
                // Store original positions (current position, not fixed position to account for Z movement)
                this.originalShakePosition = this.camera.position.clone();
                this.originalShakeTarget = this.fixedTargetPosition.clone();
                
                // Set up completion callback
                setTimeout(() => {
                    this.stopShake();
                    resolve();
                }, duration);
                
            } catch (error) {
                console.error('🎮 Error triggering FPS camera shake:', error);
                this.stopShake();
                resolve();
            }
        });
    }

    /**
     * 🎮 Update shake animation (called from update loop)
     */
    private updateShake(): void {
        if (!this.isShaking) return;
        
        const elapsed = Date.now() - this.shakeStartTime;
        const progress = elapsed / this.shakeDuration;
        
        if (progress >= 1) {
            this.stopShake();
            return;
        }
        
        const fadeOut = 1 - progress; // Gradually reduce shake intensity
        const frequency = 60; // Higher frequency for more realistic feel
        
        // 🎮 FPS-specific shake patterns - only position shake, target stays fixed
        const shakeX = Math.sin(elapsed * frequency * 0.001 * Math.PI * 2) * this.shakeIntensity * 0.3 * fadeOut;
        const shakeY = Math.cos(elapsed * frequency * 0.001 * Math.PI * 2 * 0.7) * this.shakeIntensity * 0.6 * fadeOut;
        const shakeZ = Math.sin(elapsed * frequency * 0.001 * Math.PI * 2 * 1.2) * this.shakeIntensity * 0.2 * fadeOut;
        
        // Apply ONLY position shake - target remains fixed for consistent focus
        this.camera.position.x = this.originalShakePosition.x + shakeX;
        this.camera.position.y = this.originalShakePosition.y + shakeY;
        this.camera.position.z = this.originalShakePosition.z + shakeZ;
    }

    /**
     * 🎮 Stop shake and restore camera to normal tracking
     */
    private stopShake(): void {
        if (!this.isShaking) return;
        this.isShaking = false;
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