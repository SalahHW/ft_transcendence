import * as BABYLON from '@babylonjs/core';
import { BALL_CONSTANTS } from '../core/ballConstants.js';

export class BallTrail {
    private particleSystem: BABYLON.ParticleSystem | null = null;
    private scene: BABYLON.Scene | null = null;
    private ballMesh: BABYLON.Mesh | null = null;
    private isActive: boolean = false;
    private maxParticles: number = BALL_CONSTANTS.TRAIL.MAX_PARTICLES; // Number of particles for the trail
    private particleLifetime: number = BALL_CONSTANTS.TRAIL.LIFETIME; // How long particles live (in seconds)

    constructor() {
        // Constructor kept simple
    }

    /**
     * Initialize the trail system
     * @param scene - Babylon.js scene
     * @param ballMesh - The ball mesh to follow
     */
    public initialize(scene: BABYLON.Scene, ballMesh: BABYLON.Mesh): void {
        this.scene = scene;
        this.ballMesh = ballMesh;
    }

    /**
     * Create the particle trail when entering highest speed
     * @param glowColor - Current glow color of the ball to match trail color
     */
    public createTrail(glowColor?: BABYLON.Color3): void {
        if (!this.scene || !this.ballMesh || this.particleSystem) {
            return;
        }

        // Create particle system for 3D volumetric trail
        this.particleSystem = new BABYLON.ParticleSystem("ballTrail", this.maxParticles, this.scene);
        
        // Set the ball as the emitter
        this.particleSystem.emitter = this.ballMesh;
        
        // Set particle texture (simple white circle for glow effect)
        this.particleSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", this.scene);
        
        // Trail color setup
        const trailColor = glowColor || new BABYLON.Color3(1.0, 0.8, 0.4);
        
        // Particle appearance
        this.particleSystem.minSize = 0.3;
        this.particleSystem.maxSize = 0.8;
        this.particleSystem.minLifeTime = this.particleLifetime * 0.8;
        this.particleSystem.maxLifeTime = this.particleLifetime * 1.2;
        
        // Colors - start bright, fade to transparent
        this.particleSystem.color1 = new BABYLON.Color4(trailColor.r, trailColor.g, trailColor.b, 1.0);
        this.particleSystem.color2 = new BABYLON.Color4(trailColor.r, trailColor.g, trailColor.b, 0.8);
        this.particleSystem.colorDead = new BABYLON.Color4(trailColor.r * 0.5, trailColor.g * 0.5, trailColor.b * 0.5, 0.0);
        
        // Emission settings for trail effect
        this.particleSystem.minEmitBox = new BABYLON.Vector3(-0.1, -0.1, -0.1);
        this.particleSystem.maxEmitBox = new BABYLON.Vector3(0.1, 0.1, 0.1);
        this.particleSystem.emitRate = 100; // Particles per second
        
        // Movement - particles should stay relatively still after emission (trail effect)
        this.particleSystem.minEmitPower = 0.5;
        this.particleSystem.maxEmitPower = 1.0;
        this.particleSystem.updateSpeed = 0.02;
        
        // Blending for glow effect
        this.particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        
        this.particleSystem.start();
        this.isActive = true;
    }

    /**
     * Remove the particle trail when speed drops
     */
    public removeTrail(): void {
        if (this.particleSystem) {
            this.particleSystem.stop();
            this.particleSystem.dispose();
            this.particleSystem = null;
        }
        this.isActive = false;
    }

    /**
     * Update trail based on ball speed tier
     * @param speedTier - Current speed tier (0, 1, or 2)
     * @param glowColor - Current ball glow color
     */
    public updateTrail(speedTier: number, glowColor?: BABYLON.Color3): void {
        const shouldShowTrail = speedTier >= BALL_CONSTANTS.TRAIL.ACTIVATION_TIER; // Only show at highest speed (rebounds >= 20)

        if (shouldShowTrail && !this.isActive) {
            // Create trail when entering highest speed
            this.createTrail(glowColor);
        } else if (!shouldShowTrail && this.isActive) {
            // Remove trail when speed drops
            this.removeTrail();
        } else if (this.isActive && this.particleSystem && glowColor) {
            // Update trail color if already active and color changed
            this.particleSystem.color1 = new BABYLON.Color4(glowColor.r, glowColor.g, glowColor.b, 1.0);
            this.particleSystem.color2 = new BABYLON.Color4(glowColor.r, glowColor.g, glowColor.b, 0.8);
            this.particleSystem.colorDead = new BABYLON.Color4(glowColor.r * 0.5, glowColor.g * 0.5, glowColor.b * 0.5, 0.0);
        }
    }

    /**
     * Clean up trail resources
     */
    public dispose(): void {
        this.removeTrail();
        this.scene = null;
        this.ballMesh = null;
    }

    /**
     * Check if trail is currently active
     */
    public get active(): boolean {
        return this.isActive;
    }
}
