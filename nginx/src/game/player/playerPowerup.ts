import * as BABYLON from '@babylonjs/core';
import { BALL_CONSTANTS } from '../ball/ballConstants.js';

interface PowerupState {
    playerId: string;
    isAvailable: boolean;
    isActive: boolean;
    canActivate: boolean;
    remainingCooldown: number;
    windowTimeLeft: number;
}

export class PlayerPowerup {
    private playerId: string;
    private scene: BABYLON.Scene;
    private playerRole: number = 0; // 0 = right side, 1 = left side
    
    // Visual feedback elements
    private powerupIndicator: BABYLON.Mesh | null = null;
    private cooldownBar: BABYLON.Mesh | null = null;
    private activationRing: BABYLON.Mesh | null = null;
    private uiContainer: BABYLON.Mesh | null = null;
    
    // State tracking
    public isAvailable: boolean = false; // Start false until speed tier is met
    public isActive: boolean = false;
    public remainingCooldown: number = 0;
    public windowTimeLeft: number = 0;

        constructor(playerId: string, scene: BABYLON.Scene, playerRole: number = 0) {
        this.playerId = playerId;
        this.scene = scene;
        this.playerRole = playerRole;
        this.createVisualElements();
        this.updateVisuals(); // Ensure initial state is reflected visually
    }

    private createVisualElements(): void {
        // Create UI container
        this.uiContainer = new BABYLON.Mesh(`powerup-ui-${this.playerId}`, this.scene);
        
        // ⭐ HUD UI: Start at head level center (will be updated by updateCameraPosition)
        this.uiContainer.position = new BABYLON.Vector3(0, 1, 6); // Head level, centered, close to camera
        

        
        // Create powerup availability indicator (keeping reference for compatibility but making it invisible)
        this.powerupIndicator = BABYLON.MeshBuilder.CreateSphere(
            `powerup-indicator-${this.playerId}`,
            { diameter: 0.01 }, // Make it tiny
            this.scene
        );
        this.powerupIndicator.parent = this.uiContainer;
        this.powerupIndicator.position = new BABYLON.Vector3(0, 0, 0);
        this.powerupIndicator.isVisible = false; // Hide the sphere - we'll use only the progress bar
        
        const indicatorMaterial = new BABYLON.StandardMaterial(`indicator-mat-${this.playerId}`, this.scene);
        indicatorMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.8, 0.2); // Green when available
        this.powerupIndicator.material = indicatorMaterial;
        
        // ⭐ HORIZONTAL POWERUP BAR: Create main powerup progress bar (horizontal)
        this.cooldownBar = BABYLON.MeshBuilder.CreateBox(
            `powerup-bar-${this.playerId}`,
            { width: 3, height: 0.2, depth: 0.1 }, // ⭐ HORIZONTAL: width=3 (long), height=0.2 (thin but visible), depth=0.1 (flat)
            this.scene
        );
        this.cooldownBar.parent = this.uiContainer;
        this.cooldownBar.position = new BABYLON.Vector3(0, 0, 0); // Center it since no sphere
        this.cooldownBar.isVisible = true; // Always visible now
        
        const cooldownMaterial = new BABYLON.StandardMaterial(`powerup-bar-mat-${this.playerId}`, this.scene);
        cooldownMaterial.emissiveColor = new BABYLON.Color3(0.4, 0.4, 0.4); // Start grey (unavailable)
        this.cooldownBar.material = cooldownMaterial;
        
        // Create activation ring (visible during activation window)
        this.activationRing = BABYLON.MeshBuilder.CreateTorus(
            `activation-ring-${this.playerId}`,
            { diameter: 2, thickness: 0.1 },
            this.scene
        );
        this.activationRing.parent = this.uiContainer;
        this.activationRing.position = new BABYLON.Vector3(0, 0, 0);
        this.activationRing.isVisible = false;
        
        const ringMaterial = new BABYLON.StandardMaterial(`ring-mat-${this.playerId}`, this.scene);
        ringMaterial.emissiveColor = new BABYLON.Color3(1, 1, 0); // Yellow during activation
        this.activationRing.material = ringMaterial;
    }



    private showFailureFeedback(): void {
        // Flash the indicator red briefly to show failed activation
        if (this.powerupIndicator && this.powerupIndicator.material) {
            const material = this.powerupIndicator.material as BABYLON.StandardMaterial;
            const originalColor = material.emissiveColor.clone();
            
            material.emissiveColor = new BABYLON.Color3(1, 0, 0); // Flash red
            
            setTimeout(() => {
                material.emissiveColor = originalColor;
            }, 200);
        }
    }

    // ⭐ NEW: Show success feedback when offensive powerup is successfully activated
    public showSuccessFeedback(): void {
        if (!this.powerupIndicator || !this.powerupIndicator.material) return;
        
        const material = this.powerupIndicator.material as BABYLON.StandardMaterial;
        const originalColor = material.emissiveColor.clone();
        
        // Bright flash sequence: White -> Green -> Original
        const flashSequence = [
            { color: new BABYLON.Color3(2, 2, 2), duration: 100 },    // Bright white flash
            { color: new BABYLON.Color3(0, 2, 0), duration: 200 },    // Bright green
            { color: new BABYLON.Color3(0, 1.5, 0), duration: 200 },  // Medium green
            { color: originalColor, duration: 100 }                    // Back to original
        ];
        
        let currentStep = 0;
        const executeFlash = () => {
            if (currentStep >= flashSequence.length) return;
            
            const step = flashSequence[currentStep];
            material.emissiveColor = step.color;
            
            setTimeout(() => {
                currentStep++;
                executeFlash();
            }, step.duration);
        };
        
        executeFlash();
        
        // Also create a success burst effect
        this.createSuccessBurst();
        
        // ⭐ NEW: Show success text notification
        this.showSuccessText();
    }

    // ⭐ NEW: Show defensive success feedback when defensive counter-powerup is activated
    public showDefensiveSuccessFeedback(): void {
        if (!this.powerupIndicator || !this.powerupIndicator.material) return;
        
        const material = this.powerupIndicator.material as BABYLON.StandardMaterial;
        const originalColor = material.emissiveColor.clone();
        
        // Different flash sequence for defensive: Blue -> Shield colors
        const flashSequence = [
            { color: new BABYLON.Color3(0, 2, 2), duration: 100 },    // Bright cyan flash
            { color: new BABYLON.Color3(0, 0, 2), duration: 200 },    // Bright blue
            { color: new BABYLON.Color3(0.3, 0.3, 1.5), duration: 200 },  // Shield blue
            { color: originalColor, duration: 100 }                    // Back to original
        ];
        
        let currentStep = 0;
        const executeFlash = () => {
            if (currentStep >= flashSequence.length) return;
            
            const step = flashSequence[currentStep];
            material.emissiveColor = step.color;
            
            setTimeout(() => {
                currentStep++;
                executeFlash();
            }, step.duration);
        };
        
        executeFlash();
        
        // Create defensive burst effect (blue/shield colors)
        this.createDefensiveBurst();
        
        // Show defensive success text
        this.showDefensiveSuccessText();
    }

    // ⭐ NEW: Show "POWER UP!" text notification
    private showSuccessText(): void {
        if (!this.scene) return;
        
        // Create text mesh for success notification
        const textMesh = BABYLON.MeshBuilder.CreateGround("powerupText", {width: 3, height: 1}, this.scene);
        if (this.uiContainer) {
            textMesh.parent = this.uiContainer;
        }
        textMesh.position = new BABYLON.Vector3(0, 2, 0);
        
        // Create material for text
        const textMaterial = new BABYLON.StandardMaterial("powerupTextMat", this.scene);
        textMaterial.emissiveColor = new BABYLON.Color3(1, 1, 0); // Bright yellow
        textMaterial.disableLighting = true;
        textMesh.material = textMaterial;
        
        // Add text texture (simplified - you might want to use a proper text texture)
        console.log('⚡ POWER UP SUCCESS! ⚡');
        
        // Animate the text (scale up then fade out)
        const scaleAnimation = new BABYLON.Animation(
            "textScale",
            "scaling",
            60,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const alphaAnimation = new BABYLON.Animation(
            "textAlpha",
            "visibility",
            60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const scaleKeys = [
            { frame: 0, value: new BABYLON.Vector3(0.1, 0.1, 0.1) },
            { frame: 15, value: new BABYLON.Vector3(1.5, 1.5, 1.5) },
            { frame: 45, value: new BABYLON.Vector3(1.2, 1.2, 1.2) },
            { frame: 90, value: new BABYLON.Vector3(0.8, 0.8, 0.8) }
        ];
        
        const alphaKeys = [
            { frame: 0, value: 1 },
            { frame: 30, value: 1 },
            { frame: 90, value: 0 }
        ];
        
        scaleAnimation.setKeys(scaleKeys);
        alphaAnimation.setKeys(alphaKeys);
        
        textMesh.animations = [scaleAnimation, alphaAnimation];
        
        this.scene.beginAnimation(textMesh, 0, 90, false, 1, () => {
            textMesh.dispose();
        });
    }

    // ⭐ NEW: Show "DEFENSIVE COUNTER!" text notification
    private showDefensiveSuccessText(): void {
        if (!this.scene) return;
        
        // Create text mesh for defensive success notification
        const textMesh = BABYLON.MeshBuilder.CreateGround("defensiveText", {width: 4, height: 1}, this.scene);
        if (this.uiContainer) {
            textMesh.parent = this.uiContainer;
        }
        textMesh.position = new BABYLON.Vector3(0, 2, 0);
        
        // Create material for defensive text (blue/cyan)
        const textMaterial = new BABYLON.StandardMaterial("defensiveTextMat", this.scene);
        textMaterial.emissiveColor = new BABYLON.Color3(0, 1, 1); // Bright cyan
        textMaterial.disableLighting = true;
        textMesh.material = textMaterial;
        
        // Add text texture (simplified)
        
        
        // Animate the text (scale up then fade out)
        const scaleAnimation = new BABYLON.Animation(
            "defensiveTextScale",
            "scaling",
            60,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const alphaAnimation = new BABYLON.Animation(
            "defensiveTextAlpha",
            "visibility",
            60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const scaleKeys = [
            { frame: 0, value: new BABYLON.Vector3(0.1, 0.1, 0.1) },
            { frame: 15, value: new BABYLON.Vector3(1.5, 1.5, 1.5) },
            { frame: 45, value: new BABYLON.Vector3(1.2, 1.2, 1.2) },
            { frame: 90, value: new BABYLON.Vector3(0.8, 0.8, 0.8) }
        ];
        
        const alphaKeys = [
            { frame: 0, value: 1 },
            { frame: 30, value: 1 },
            { frame: 90, value: 0 }
        ];
        
        scaleAnimation.setKeys(scaleKeys);
        alphaAnimation.setKeys(alphaKeys);
        
        textMesh.animations = [scaleAnimation, alphaAnimation];
        
        this.scene.beginAnimation(textMesh, 0, 90, false, 1, () => {
            textMesh.dispose();
        });
    }

    // ⭐ NEW: Create particle burst effect for successful powerup
    private createSuccessBurst(): void {
        if (!this.uiContainer) return;
        
        const burstSystem = new BABYLON.ParticleSystem("powerupSuccess", 30, this.scene);
        burstSystem.emitter = this.uiContainer;
        
        // Create a simple white texture for particles
        burstSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", this.scene);
        
        // Burst properties
        burstSystem.minSize = 0.1;
        burstSystem.maxSize = 0.3;
        burstSystem.minLifeTime = 0.3;
        burstSystem.maxLifeTime = 0.8;
        
        // Success colors - gold/yellow burst
        burstSystem.color1 = new BABYLON.Color4(1, 1, 0, 1);    // Bright yellow
        burstSystem.color2 = new BABYLON.Color4(1, 0.8, 0, 1);  // Orange-yellow
        burstSystem.colorDead = new BABYLON.Color4(1, 0.6, 0, 0); // Fade to transparent orange
        
        // Burst emission - radial explosion
        burstSystem.minEmitBox = new BABYLON.Vector3(-0.1, -0.1, -0.1);
        burstSystem.maxEmitBox = new BABYLON.Vector3(0.1, 0.1, 0.1);
        
        // High power for explosive effect
        burstSystem.minEmitPower = 3;
        burstSystem.maxEmitPower = 6;
        burstSystem.updateSpeed = 0.02;
        
        // Additive blending for bright effect
        burstSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        
        // Short burst duration
        burstSystem.targetStopDuration = 0.2;
        
        burstSystem.start();
        
        // Auto-dispose after animation
        setTimeout(() => {
            burstSystem.stop();
            burstSystem.dispose();
        }, 1000);
    }

    // ⭐ NEW: Create defensive particle burst effect (blue/cyan colors)
    private createDefensiveBurst(): void {
        if (!this.uiContainer) return;
        
        const burstSystem = new BABYLON.ParticleSystem("defensivePowerupSuccess", 40, this.scene);
        burstSystem.emitter = this.uiContainer;
        
        // Create a simple white texture for particles
        burstSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", this.scene);
        
        // Defensive burst properties
        burstSystem.minSize = 0.15;
        burstSystem.maxSize = 0.4;
        burstSystem.minLifeTime = 0.4;
        burstSystem.maxLifeTime = 1.0;
        
        // Defensive colors - blue/cyan burst
        burstSystem.color1 = new BABYLON.Color4(0, 1, 1, 1);    // Bright cyan
        burstSystem.color2 = new BABYLON.Color4(0, 0.5, 1, 1);  // Blue
        burstSystem.colorDead = new BABYLON.Color4(0, 0.3, 0.8, 0); // Fade to transparent blue
        
        // Defensive burst emission - shield-like pattern
        burstSystem.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
        burstSystem.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);
        
        // High power for defensive impact effect
        burstSystem.minEmitPower = 4;
        burstSystem.maxEmitPower = 8;
        burstSystem.updateSpeed = 0.02;
        
        // Additive blending for bright effect
        burstSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        
        // Longer burst duration for defensive effect
        burstSystem.targetStopDuration = 0.3;
        
        burstSystem.start();
        
        // Auto-dispose after animation
        setTimeout(() => {
            burstSystem.stop();
            burstSystem.dispose();
        }, 1200);
    }



    public updateState(state: PowerupState): void {
        this.isAvailable = state.isAvailable;
        this.isActive = state.isActive;
        this.remainingCooldown = state.remainingCooldown;
        this.windowTimeLeft = state.windowTimeLeft;
        
        this.updateVisuals();
    }

    /**
     * ⭐ HUD-STYLE UI: Update powerup UI position to stay as a HUD element at head level
     */
    public updateCameraPosition(): void {
        if (!this.scene.activeCamera || !this.uiContainer) return;
        
        const camera = this.scene.activeCamera;
        const cameraPosition = camera.position;
        
        // For FPS cameras, position UI like a HUD element at head level
        if (camera.name && camera.name.includes('fpsCamera')) {
            // Get camera forward direction
            const universalCamera = camera as BABYLON.UniversalCamera;
            const cameraTarget = universalCamera.getTarget();
            const cameraForward = cameraTarget.subtract(cameraPosition).normalize();
            const cameraRight = BABYLON.Vector3.Cross(cameraForward, BABYLON.Vector3.Up()).normalize();
            
            // ⭐ HUD POSITIONING: Position like a HUD element at head level, slightly above center
            const distanceFromCamera = 4; // Close enough to feel like HUD
            const verticalOffset = -1; // Slightly above center (head level)
            const horizontalOffset = 0; // Centered horizontally
            
            const uiPosition = cameraPosition
                .add(cameraForward.scale(distanceFromCamera))
                .add(BABYLON.Vector3.Up().scale(verticalOffset))
                .add(cameraRight.scale(horizontalOffset));
            
            this.uiContainer.position = uiPosition;
            
            // Make UI face the camera for HUD effect
            this.uiContainer.lookAt(cameraPosition);
            
        } else {
            // For top-down camera, position as traditional HUD at top of screen
            this.uiContainer.position = new BABYLON.Vector3(
                cameraPosition.x, // Centered horizontally
                cameraPosition.y - 8, // Top of screen
                cameraPosition.z + 2 // Slightly forward
            );
        }
    }

    private updateVisuals(): void {
        if (!this.cooldownBar || !this.activationRing) return;
        
        const barMaterial = this.cooldownBar.material as BABYLON.StandardMaterial;
        
        if (this.isActive) {
            // Show activation timing window - bar is full and yellow/orange (like ball glow)
            barMaterial.emissiveColor = new BABYLON.Color3(1, 0.8, 0); // Yellow-orange like ball glow
            this.cooldownBar.scaling.x = 1; // Full bar (horizontal scaling)
            this.activationRing.isVisible = true;
            
            // Animate activation ring
            const animation = new BABYLON.Animation(
                "ringPulse",
                "scaling.x",
                60,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            
            const keys = [
                { frame: 0, value: 1 },
                { frame: 30, value: 1.2 },
                { frame: 60, value: 1 }
            ];
            animation.setKeys(keys);
            
            this.activationRing.animations = [animation];
            this.scene.beginAnimation(this.activationRing, 0, 60, true);
            
        } else if (this.remainingCooldown > 0) {
            // Show cooldown progress - bar grows from empty to full and stays red
            barMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.2, 0.2); // Red during cooldown
            this.activationRing.isVisible = false;
            
            // Calculate progress: starts at 0 (empty) and grows to 1 (full)
            const maxCooldown = 7000; // 15 seconds in ms
            const cooldownProgress = 1 - (this.remainingCooldown / maxCooldown); // Invert so it grows
            this.cooldownBar.scaling.x = Math.max(0.05, cooldownProgress); // Minimum 5% so it's visible (horizontal scaling)
            
        } else if (this.isAvailable) {
            // Available state - bar is full and green (like ball when ready)
            barMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.8, 0.2); // Green when available
            this.cooldownBar.scaling.x = 1; // Full bar (horizontal scaling)
            this.activationRing.isVisible = false;
            
        } else {
            // Unavailable (ball doesn't have enough rebounds) - bar is full but gray
            barMaterial.emissiveColor = new BABYLON.Color3(0.4, 0.4, 0.4); // Gray when unavailable
            this.cooldownBar.scaling.x = 1; // Full bar but gray (horizontal scaling)
            this.activationRing.isVisible = false;
        }
    }

    public dispose(): void {
        if (this.powerupIndicator) {
            this.powerupIndicator.dispose();
            this.powerupIndicator = null;
        }
        
        if (this.cooldownBar) {
            this.cooldownBar.dispose();
            this.cooldownBar = null;
        }
        
        if (this.activationRing) {
            this.activationRing.dispose();
            this.activationRing = null;
        }
        
        if (this.uiContainer) {
            this.uiContainer.dispose();
            this.uiContainer = null;
        }
    }
}
