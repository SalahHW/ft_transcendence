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
    private keyPressed: boolean = false;
    private onActivationCallback?: (playerId: string) => void;
    private playerRole: number = 0; // 0 = right side, 1 = left side
    
    // Visual feedback elements
    private powerupIndicator: BABYLON.Mesh | null = null;
    private cooldownBar: BABYLON.Mesh | null = null;
    private activationRing: BABYLON.Mesh | null = null;
    private uiContainer: BABYLON.Mesh | null = null;
    
    // State tracking
    public isAvailable: boolean = true;
    public isActive: boolean = false;
    public remainingCooldown: number = 0;
    public windowTimeLeft: number = 0;

    constructor(playerId: string, scene: BABYLON.Scene, playerRole: number = 0) {
        this.playerId = playerId;
        this.scene = scene;
        this.playerRole = playerRole;
        this.setupInputHandling();
        this.createVisualElements();
    }

    private setupInputHandling(): void {
        // Listen for 'A' key press
        this.scene.actionManager = this.scene.actionManager || new BABYLON.ActionManager(this.scene);
        
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnKeyDownTrigger,
            (evt) => {
                if (evt.sourceEvent.key.toLowerCase() === 'a' && !this.keyPressed) {
                    this.keyPressed = true;
                    this.tryActivatePowerup();
                }
            }
        ));

        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnKeyUpTrigger,
            (evt) => {
                if (evt.sourceEvent.key.toLowerCase() === 'a') {
                    this.keyPressed = false;
                }
            }
        ));
    }

    private createVisualElements(): void {
        // Create UI container
        this.uiContainer = new BABYLON.Mesh(`powerup-ui-${this.playerId}`, this.scene);
        
        // Position UI based on player role (0 = right side, 1 = left side)
        const xPosition = this.playerRole === 0 ? 15 : -15;
        this.uiContainer.position = new BABYLON.Vector3(xPosition, 5, 0);
        

        
        // Create powerup availability indicator
        this.powerupIndicator = BABYLON.MeshBuilder.CreateSphere(
            `powerup-indicator-${this.playerId}`,
            { diameter: 1 },
            this.scene
        );
        this.powerupIndicator.parent = this.uiContainer;
        this.powerupIndicator.position = new BABYLON.Vector3(0, 0, 0);
        
        const indicatorMaterial = new BABYLON.StandardMaterial(`indicator-mat-${this.playerId}`, this.scene);
        indicatorMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.8, 0.2); // Green when available
        this.powerupIndicator.material = indicatorMaterial;
        
        // Create cooldown bar
        this.cooldownBar = BABYLON.MeshBuilder.CreateBox(
            `cooldown-bar-${this.playerId}`,
            { width: 2, height: 0.2, depth: 0.1 },
            this.scene
        );
        this.cooldownBar.parent = this.uiContainer;
        this.cooldownBar.position = new BABYLON.Vector3(0, -1, 0);
        this.cooldownBar.isVisible = false;
        
        const cooldownMaterial = new BABYLON.StandardMaterial(`cooldown-mat-${this.playerId}`, this.scene);
        cooldownMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.2, 0.2); // Red for cooldown
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

    private tryActivatePowerup(): void {
        if (this.isAvailable && !this.isActive && this.remainingCooldown <= 0) {
            // Call activation callback (will communicate with server)
            if (this.onActivationCallback) {
                this.onActivationCallback(this.playerId);
            }
        } else {
            this.showFailureFeedback();
        }
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

    public setActivationCallback(callback: (playerId: string) => void): void {
        this.onActivationCallback = callback;
    }

    public updateState(state: PowerupState): void {
        this.isAvailable = state.isAvailable;
        this.isActive = state.isActive;
        this.remainingCooldown = state.remainingCooldown;
        this.windowTimeLeft = state.windowTimeLeft;
        
        this.updateVisuals();
    }

    private updateVisuals(): void {
        if (!this.powerupIndicator || !this.cooldownBar || !this.activationRing) return;
        
        const indicatorMaterial = this.powerupIndicator.material as BABYLON.StandardMaterial;
        const cooldownMaterial = this.cooldownBar.material as BABYLON.StandardMaterial;
        
        if (this.isActive) {
            // Show activation window
            indicatorMaterial.emissiveColor = new BABYLON.Color3(1, 1, 0); // Yellow during activation
            this.activationRing.isVisible = true;
            this.cooldownBar.isVisible = false;
            
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
            // Show cooldown
            indicatorMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.2, 0.2); // Red during cooldown
            this.activationRing.isVisible = false;
            this.cooldownBar.isVisible = true;
            
            // Update cooldown bar scale (assuming max cooldown of 15 seconds)
            const maxCooldown = 15000; // 15 seconds in ms
            const cooldownProgress = this.remainingCooldown / maxCooldown;
            this.cooldownBar.scaling.x = cooldownProgress;
            
        } else if (this.isAvailable) {
            // Available state
            indicatorMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.8, 0.2); // Green when available
            this.activationRing.isVisible = false;
            this.cooldownBar.isVisible = false;
            this.cooldownBar.scaling.x = 1;
            
        } else {
            // Unavailable (but not on cooldown - maybe wrong speed tier)
            indicatorMaterial.emissiveColor = new BABYLON.Color3(0.4, 0.4, 0.4); // Gray when unavailable
            this.activationRing.isVisible = false;
            this.cooldownBar.isVisible = false;
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
