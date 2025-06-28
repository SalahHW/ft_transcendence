import * as BABYLON from '@babylonjs/core';
import { createExplosion } from './ballEffects.js';
import { playerPaddle } from '../player/player.js';
import { BallTrail } from './ballTrail.js';
import { BALL_CONSTANTS } from '../core/ballConstants.js';

interface BallState {
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    previousVelocity: { x: number; y: number; z: number };
    rebounds?: number;
    isRespawning?: boolean;
    respawnTime?: number;
    wasHitByPlayer?: any;
    speed?: number;
    currentGlowColor?: { r: number; g: number; b: number };
    isInitialSpawn?: boolean;
}

class Ball {
    public position: BABYLON.Vector3;
    public velocity: BABYLON.Vector3;
    public previousVelocity: BABYLON.Vector3;
    public radius: number;
    public rebounds: number;
    public wasHitByPlayer: any;
    public ballBody: BABYLON.Mesh | null;
    public ballMaterial: BABYLON.StandardMaterial | null;
    public isGlowing: boolean;
    public currentGlowColor: BABYLON.Color3;
    public isRespawning: boolean;
    public respawnTime: number;
    public respawnDuration: number;
    public player1: playerPaddle;
    public player2: playerPaddle;
    public lastPosition: BABYLON.Vector3;
    public lastUpdateTime: number;
    public hasValidPosition: boolean;
    public speed: number;
    public ballTrail: BallTrail;

    constructor(player1: playerPaddle, player2: playerPaddle) {
        this.position = new BABYLON.Vector3(
            BALL_CONSTANTS.INITIAL_POSITION.x,
            BALL_CONSTANTS.INITIAL_POSITION.y,
            BALL_CONSTANTS.INITIAL_POSITION.z
        );
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.previousVelocity = new BABYLON.Vector3(0, 0, 0);
        this.radius = BALL_CONSTANTS.RADIUS;
        this.rebounds = 0;
        this.wasHitByPlayer = undefined;
        this.ballBody = null;
        this.ballMaterial = null;
        this.isGlowing = false;
        this.currentGlowColor = new BABYLON.Color3(0, 0, 0);
        this.isRespawning = false;
        this.respawnTime = 0;
        this.respawnDuration = 3;
        this.player1 = player1;
        this.player2 = player2;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
        this.hasValidPosition = true;
        this.speed = BALL_CONSTANTS.INITIAL_SPEED;
        this.ballTrail = new BallTrail();
    }

    init(): void {
        this.position = new BABYLON.Vector3(
            BALL_CONSTANTS.INITIAL_POSITION.x,
            BALL_CONSTANTS.INITIAL_POSITION.y,
            BALL_CONSTANTS.INITIAL_POSITION.z
        );
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.previousVelocity = new BABYLON.Vector3(0, 0, 0);
        this.rebounds = 0;
        this.isRespawning = false;
        this.respawnTime = 0;
        this.hasValidPosition = true;
        this.speed = BALL_CONSTANTS.INITIAL_SPEED;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
        if (this.ballBody) {
            this.ballBody.position = new BABYLON.Vector3(
                BALL_CONSTANTS.INITIAL_POSITION.x,
                BALL_CONSTANTS.INITIAL_POSITION.y,
                BALL_CONSTANTS.INITIAL_POSITION.z
            );
            this.ballBody.isVisible = false;
        }
        
        // Reset trail on initialization
        if (this.ballTrail) {
            this.ballTrail.updateTrail(0); // Force remove trail at speed tier 0
        }
    }

    createBall(scene: BABYLON.Scene): void {
        this.ballBody = BABYLON.MeshBuilder.CreateSphere("ball", { 
            diameter: BALL_CONSTANTS.DIAMETER, 
            segments: BALL_CONSTANTS.SEGMENTS 
        }, scene);
        this.ballMaterial = new BABYLON.StandardMaterial("glowMat", scene);
        
        // Enhanced material setup for glowing effects
        this.ballMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8); // Slightly gray base
        this.ballMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0); // Start with no glow
        this.ballMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Very low specular
        this.ballMaterial.roughness = 1.0; // Make it non-reflective
        this.ballMaterial.disableLighting = false; // Keep lighting but emissive will override
        
        this.position = new BABYLON.Vector3(0, -2, 0);
        this.ballBody.position = new BABYLON.Vector3(0, -2, 0);
        this.ballBody.material = this.ballMaterial;
        this.ballBody.isVisible = false;
        
        // Initialize trail system
        this.ballTrail.initialize(scene, this.ballBody);
    }

    updateClient(scene: BABYLON.Scene): void {
        if (this.ballBody && this.hasValidPosition) {
            this.ballBody.position.copyFrom(this.position);
            
            // ⭐ CRITICAL FIX: More robust visibility logic for tournament games
            const shouldBeVisible = this.isRespawning || this.position.y >= -3;
            
            // Force visibility if respawning (important for tournament final initialization)
            if (this.isRespawning) {
                this.ballBody.isVisible = true;
            } else {
                this.ballBody.isVisible = shouldBeVisible;
            }
        }
    }

    setState(state: BallState): void {
        if (state.isInitialSpawn) {
            this.position = new BABYLON.Vector3(0, -2, 0);
            this.velocity = new BABYLON.Vector3(0, 0, 0);
            this.previousVelocity = new BABYLON.Vector3(0, 0, 0);
            this.isRespawning = true;
            this.respawnTime = 0;
            this.hasValidPosition = true;
            if (this.ballBody) {
                this.ballBody.position = new BABYLON.Vector3(0, -2, 0);
                this.ballBody.isVisible = true;
            }
            return;
        }

        this.position = new BABYLON.Vector3(
            state.position.x,
            state.position.y,
            state.position.z
        );
        
        this.velocity = new BABYLON.Vector3(
            state.velocity.x,
            state.velocity.y,
            state.velocity.z
        );
        
        this.previousVelocity = new BABYLON.Vector3(
            state.previousVelocity.x,
            state.previousVelocity.y,
            state.previousVelocity.z
        );

        const previousRebounds = this.rebounds;
        this.rebounds = state.rebounds || 0;
        this.isRespawning = state.isRespawning || false;
        this.respawnTime = state.respawnTime || 0;
        this.wasHitByPlayer = state.wasHitByPlayer;
        this.hasValidPosition = true;
        this.speed = state.speed || 25;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();

        // Handle glow transitions based on speed tier changes
        if (state.currentGlowColor && this.ballBody && this.ballMaterial) {
            const newGlowColor = new BABYLON.Color3(
                state.currentGlowColor.r,
                state.currentGlowColor.g,
                state.currentGlowColor.b
            );
            
            // Check if we need to start a glow transition
            const speedTier = this.getSpeedTier(this.rebounds);
            const previousSpeedTier = this.getSpeedTier(previousRebounds);
            
            if (speedTier !== previousSpeedTier) {
                // Stop any existing animations to prevent conflicts
                if (this.ballMaterial.animations && this.ballMaterial.animations.length > 0) {
                    this.ballBody.getScene().stopAnimation(this.ballMaterial);
                    this.ballMaterial.animations = [];
                }
                
                if (speedTier > 0) {
                    // Always use smooth 3-second animation for all glow transitions
                    this.startGlowTransition(newGlowColor, 3000);
                } else {
                    // Transitioning to no glow - animate to black
                    this.startGlowTransition(new BABYLON.Color3(0, 0, 0), 3000);
                }
            } else if (speedTier > 0) {
                // Update emissive color directly if already glowing (same tier updates)
                this.ballMaterial.emissiveColor = newGlowColor;
                this.currentGlowColor = newGlowColor;
            }
        }

        if (this.ballBody) {
            this.ballBody.position.copyFrom(this.position);
            this.ballBody.isVisible = this.isRespawning || this.position.y >= -2;
        }

        // Update trail based on speed tier
        const currentSpeedTier = this.getSpeedTier(this.rebounds);
        const currentGlowColor = state.currentGlowColor ? 
            new BABYLON.Color3(state.currentGlowColor.r, state.currentGlowColor.g, state.currentGlowColor.b) : 
            undefined;
        this.ballTrail.updateTrail(currentSpeedTier, currentGlowColor);
    }

    startGlowTransition(targetColor: BABYLON.Color3, duration: number): void {
        if (!this.ballBody || !this.ballMaterial) {
            return;
        }
        
        // Ensure we have a proper starting color - use current emissive or fallback to black
        let startColor = this.ballMaterial.emissiveColor.clone();
        
        // If this is the very first glow transition and we don't have a proper current state
        if (!this.currentGlowColor || (this.currentGlowColor.r === 0 && this.currentGlowColor.g === 0 && this.currentGlowColor.b === 0)) {
            // Make sure we start from true black to avoid any color artifacts
            startColor = new BABYLON.Color3(0, 0, 0);
            this.ballMaterial.emissiveColor = startColor;
        }
        
        // Calculate heating intensity based on target color brightness
        const targetIntensity = Math.max(targetColor.r, targetColor.g, targetColor.b);
        const startIntensity = Math.max(startColor.r, startColor.g, startColor.b);
        
        // Create heating-based color progression with more keyframes for smoothness
        const glowAnimation = new BABYLON.Animation(
            "glowAnimation",
            "emissiveColor",
            60,
            BABYLON.Animation.ANIMATIONTYPE_COLOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // Generate heating curve colors (like metal heating up)
        const generateHeatingColor = (intensity: number): BABYLON.Color3 => {
            if (intensity <= 0) return new BABYLON.Color3(0, 0, 0); // Cold/black
            
            if (intensity <= 0.3) {
                // Dark red phase (early heating)
                const factor = intensity / 0.3;
                return new BABYLON.Color3(factor * 0.5, 0, 0);
            } else if (intensity <= 0.6) {
                // Red to orange phase
                const factor = (intensity - 0.3) / 0.3;
                return new BABYLON.Color3(
                    0.5 + factor * 0.3, // Red: 0.5 → 0.8
                    factor * 0.4,       // Green: 0 → 0.4
                    0                   // Blue: 0
                );
            } else if (intensity <= 0.9) {
                // Orange to yellow phase
                const factor = (intensity - 0.6) / 0.3;
                return new BABYLON.Color3(
                    0.8 + factor * 0.2, // Red: 0.8 → 1.0
                    0.4 + factor * 0.4, // Green: 0.4 → 0.8
                    factor * 0.2        // Blue: 0 → 0.2
                );
            } else {
                // Yellow to white-hot phase
                const factor = (intensity - 0.9) / 0.1;
                return new BABYLON.Color3(
                    1.0,                    // Red: 1.0 (max)
                    0.8 + factor * 0.2,    // Green: 0.8 → 1.0
                    0.2 + factor * 0.2     // Blue: 0.2 → 0.4
                );
            }
        };
        
        // Create smooth progression with 8 keyframes for ultra-smooth heating effect
        const keys: Array<{ frame: number; value: BABYLON.Color3 }> = [];
        const numSteps = 8;
        
        for (let i = 0; i <= numSteps; i++) {
            const progress = i / numSteps;
            const currentIntensity = startIntensity + (targetIntensity - startIntensity) * progress;
            const heatingColor = generateHeatingColor(currentIntensity);
            
            keys.push({
                frame: (60 * (duration / 1000)) * progress,
                value: heatingColor
            });
        }
        
        // Ensure the final frame exactly matches the target color
        keys[keys.length - 1].value = targetColor.clone();
        
        glowAnimation.setKeys(keys);
        this.ballMaterial.animations = [glowAnimation];
        
        this.ballBody.getScene().beginAnimation(this.ballMaterial, 0, 60 * (duration / 1000), false, 1, () => {
            this.currentGlowColor = targetColor.clone();
            this.isGlowing = targetColor.r > 0 || targetColor.g > 0 || targetColor.b > 0;
        });
    }

    dispose(): void {
        // Clean up trail resources
        if (this.ballTrail) {
            this.ballTrail.dispose();
        }
        
        // Clean up ball mesh and material
        if (this.ballBody) {
            this.ballBody.dispose();
            this.ballBody = null;
        }
        
        if (this.ballMaterial) {
            this.ballMaterial.dispose();
            this.ballMaterial = null;
        }
    }

    getSpeedTier(rebounds: number): number {
        if (rebounds < 10) return 0;
        else if (rebounds < 20) return 1;
        else return 2;
    }
}

export { Ball }; 