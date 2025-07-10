import * as BABYLON from '@babylonjs/core';

interface BallPowerupState {
    isSpeedBoosted: boolean;
    speedMultiplier: number;
    activatedByPlayer: string | null;
    originalSpeed: number;
    isDefensive?: boolean;
    stackedSpeed?: number;
}

export class BallPowerup {
    private scene: BABYLON.Scene;
    private ballMesh: BABYLON.Mesh | null = null;
    private ballMaterial: BABYLON.StandardMaterial | null = null;
    
    // Visual effects
    private speedBoostEffect: BABYLON.ParticleSystem | null = null;
    private originalGlowColor: BABYLON.Color3;
    private isSpeedBoosted: boolean = false;
    private speedMultiplier: number = 2.0;
    private activatedByPlayer: string | null = null;
    
    // Animation properties
    private boostAnimationRunning: boolean = false;
    private pulseAnimation: BABYLON.Animation | null = null;

    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        this.originalGlowColor = new BABYLON.Color3(0, 0, 0);
    }

    public initialize(ballMesh: BABYLON.Mesh, ballMaterial: BABYLON.StandardMaterial): void {
        this.ballMesh = ballMesh;
        this.ballMaterial = ballMaterial;
        this.originalGlowColor = ballMaterial.emissiveColor.clone();
    }

    public applySpeedBoostEffect(state: BallPowerupState): void {
        if (!this.ballMesh || !this.ballMaterial) return;
        
        if (state.isSpeedBoosted && !this.isSpeedBoosted) {
            // Start speed boost visual effects
            this.startSpeedBoostEffect();
            this.isSpeedBoosted = true;
            this.speedMultiplier = state.speedMultiplier;
            this.activatedByPlayer = state.activatedByPlayer;
            
        } else if (!state.isSpeedBoosted && this.isSpeedBoosted) {
            // Stop speed boost visual effects
            this.stopSpeedBoostEffect();
            this.isSpeedBoosted = false;
            this.activatedByPlayer = null;
        }
    }

    private startSpeedBoostEffect(): void {
        if (!this.ballMesh || !this.ballMaterial) return;
        
        // Create intense glowing effect during speed boost
        const boostColor = new BABYLON.Color3(1, 0.8, 0); // Bright yellow-orange
        this.ballMaterial.emissiveColor = boostColor;
        
        // Create particle trail effect for speed boost
        this.createSpeedBoostParticles();
        
        // Create pulsing animation
        this.createPulseAnimation();
        
        // Create size scaling effect
        this.createSizeBoostEffect();
    }

    private createSpeedBoostParticles(): void {
        if (!this.ballMesh || this.speedBoostEffect) return;
        
        // Create particle system for speed boost effect
        this.speedBoostEffect = new BABYLON.ParticleSystem("speedBoostEffect", 50, this.scene);
        this.speedBoostEffect.emitter = this.ballMesh;
        
        // Particle texture (simple white circle)
        this.speedBoostEffect.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", this.scene);
        
        // Particle properties
        this.speedBoostEffect.minSize = 0.2;
        this.speedBoostEffect.maxSize = 0.6;
        this.speedBoostEffect.minLifeTime = 0.3;
        this.speedBoostEffect.maxLifeTime = 0.6;
        
        // Colors - bright yellow-orange
        this.speedBoostEffect.color1 = new BABYLON.Color4(1, 0.8, 0, 1);
        this.speedBoostEffect.color2 = new BABYLON.Color4(1, 0.6, 0.2, 0.8);
        this.speedBoostEffect.colorDead = new BABYLON.Color4(1, 0.4, 0, 0);
        
        // Emission
        this.speedBoostEffect.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
        this.speedBoostEffect.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);
        this.speedBoostEffect.emitRate = 80;
        
        // Movement
        this.speedBoostEffect.minEmitPower = 1;
        this.speedBoostEffect.maxEmitPower = 3;
        this.speedBoostEffect.updateSpeed = 0.01;
        
        // Blending for intense glow
        this.speedBoostEffect.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        
        this.speedBoostEffect.start();
    }

    private createPulseAnimation(): void {
        if (!this.ballMaterial || this.pulseAnimation) return;
        
        // Create pulsing emissive color animation
        this.pulseAnimation = new BABYLON.Animation(
            "speedBoostPulse",
            "emissiveColor",
            60,
            BABYLON.Animation.ANIMATIONTYPE_COLOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const keys = [
            { frame: 0, value: new BABYLON.Color3(1, 0.8, 0) },
            { frame: 30, value: new BABYLON.Color3(1, 1, 0.5) },
            { frame: 60, value: new BABYLON.Color3(1, 0.8, 0) }
        ];
        
        this.pulseAnimation.setKeys(keys);
        this.ballMaterial.animations = [this.pulseAnimation];
        
        this.scene.beginAnimation(this.ballMaterial, 0, 60, true);
        this.boostAnimationRunning = true;
    }

    private createSizeBoostEffect(): void {
        if (!this.ballMesh) return;
        
        // Slightly increase ball size during boost
        const sizeAnimation = new BABYLON.Animation(
            "sizeBoost",
            "scaling",
            60,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const keys = [
            { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
            { frame: 15, value: new BABYLON.Vector3(1.2, 1.2, 1.2) },
            { frame: 30, value: new BABYLON.Vector3(1.1, 1.1, 1.1) }
        ];
        
        sizeAnimation.setKeys(keys);
        this.ballMesh.animations = this.ballMesh.animations || [];
        this.ballMesh.animations.push(sizeAnimation);
        
        this.scene.beginAnimation(this.ballMesh, 0, 30, false);
    }

    private stopSpeedBoostEffect(): void {
        // Stop particle effect
        if (this.speedBoostEffect) {
            this.speedBoostEffect.stop();
            this.speedBoostEffect.dispose();
            this.speedBoostEffect = null;
        }
        
        // Stop pulsing animation
        if (this.ballMaterial && this.boostAnimationRunning) {
            this.scene.stopAnimation(this.ballMaterial);
            this.ballMaterial.animations = [];
            this.boostAnimationRunning = false;
            this.pulseAnimation = null;
        }
        
        // Reset ball size
        if (this.ballMesh) {
            this.scene.stopAnimation(this.ballMesh);
            this.ballMesh.scaling = new BABYLON.Vector3(1, 1, 1);
            this.ballMesh.animations = [];
        }
        
        // Restore original glow color (if ball was already glowing)
        if (this.ballMaterial) {
            // Don't immediately restore - let the normal glow system handle it
            // The ball's regular glow handling will take over based on current speed tier
        }
    }

    public updateState(state: BallPowerupState): void {
        this.applySpeedBoostEffect(state);
    }

    public getState(): BallPowerupState {
        return {
            isSpeedBoosted: this.isSpeedBoosted,
            speedMultiplier: this.speedMultiplier,
            activatedByPlayer: this.activatedByPlayer,
            originalSpeed: 0 // Client doesn't track original speed
        };
    }

    public dispose(): void {
        // Clean up particle effects
        if (this.speedBoostEffect) {
            this.speedBoostEffect.stop();
            this.speedBoostEffect.dispose();
            this.speedBoostEffect = null;
        }
        
        // Stop animations
        if (this.ballMaterial && this.boostAnimationRunning) {
            this.scene.stopAnimation(this.ballMaterial);
            this.ballMaterial.animations = [];
        }
        
        if (this.ballMesh) {
            this.scene.stopAnimation(this.ballMesh);
            this.ballMesh.animations = [];
        }
        
        // Reset references
        this.ballMesh = null;
        this.ballMaterial = null;
        this.boostAnimationRunning = false;
        this.pulseAnimation = null;
    }

    // Check if powerup is currently active
    public hasSpeedBoost(): boolean {
        return this.isSpeedBoosted;
    }
}
