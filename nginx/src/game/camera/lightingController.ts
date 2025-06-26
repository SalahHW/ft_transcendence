import * as BABYLON from '@babylonjs/core';
import { CameraPerspective } from './povController.js';

export interface LightingConfig {
    scene: BABYLON.Scene;
    playground: BABYLON.Mesh;
}

export class LightingController {
    private scene: BABYLON.Scene;
    private playground: BABYLON.Mesh;
    
    // Original lighting (for top-down view)
    private originalMainLight: BABYLON.DirectionalLight | null = null;
    private originalAmbientLight: BABYLON.HemisphericLight | null = null;
    
    // FPS lighting
    private fpsMainLight: BABYLON.DirectionalLight | null = null;
    private fpsAmbientLight: BABYLON.HemisphericLight | null = null;
    private fpsFieldLight: BABYLON.DirectionalLight | null = null;
    
    private currentPerspective: CameraPerspective = CameraPerspective.TOP_DOWN;

    constructor(config: LightingConfig) {
        this.scene = config.scene;
        this.playground = config.playground;
    }

    /**
     * Store reference to existing lights (called during initialization)
     */
    public captureOriginalLighting(mainLight: BABYLON.DirectionalLight, ambientLight: BABYLON.HemisphericLight): void {
        this.originalMainLight = mainLight;
        this.originalAmbientLight = ambientLight;
        console.log('🔆 Original lighting captured for top-down view');
    }

    /**
     * Create FPS-optimized lighting
     */
    private createFPSLighting(): void {
        if (this.fpsMainLight) return; // Already created

        // Main directional light for FPS - angled to illuminate the field horizontally
        this.fpsMainLight = new BABYLON.DirectionalLight(
            "fpsMainLight",
            new BABYLON.Vector3(-0.3, -0.7, 0), // Angled down and slightly from the side
            this.scene
        );
        this.fpsMainLight.position = new BABYLON.Vector3(30, 50, 0);
        this.fpsMainLight.intensity = 0.8; // Stronger than original
        this.fpsMainLight.diffuse = new BABYLON.Color3(1, 1, 1);

        // Secondary light from the opposite side to illuminate the far side of the field
        this.fpsFieldLight = new BABYLON.DirectionalLight(
            "fpsFieldLight", 
            new BABYLON.Vector3(0.3, -0.5, 0), // From the other side
            this.scene
        );
        this.fpsFieldLight.position = new BABYLON.Vector3(-30, 40, 0);
        this.fpsFieldLight.intensity = 0.4; // Softer fill light
        this.fpsFieldLight.diffuse = new BABYLON.Color3(0.9, 0.9, 1); // Slightly cool

        // Enhanced ambient light for better overall visibility
        this.fpsAmbientLight = new BABYLON.HemisphericLight(
            "fpsAmbientLight",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        this.fpsAmbientLight.intensity = 0.8; // Much stronger ambient
        this.fpsAmbientLight.diffuse = new BABYLON.Color3(0.8, 0.8, 0.9); // Slightly cool tone

        // Enhance playground material for better visibility in FPS
        if (this.playground && this.playground.material) {
            const material = this.playground.material as BABYLON.StandardMaterial;
            material.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Lighter gray
            material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Slight reflection
        }

        console.log('🔆 FPS lighting system created');
    }

    /**
     * Switch to FPS lighting configuration
     */
    public switchToFPSLighting(): void {
        if (this.currentPerspective === CameraPerspective.TOP_DOWN) {
            // Disable original lights
            if (this.originalMainLight) {
                this.originalMainLight.setEnabled(false);
            }
            if (this.originalAmbientLight) {
                this.originalAmbientLight.setEnabled(false);
            }

            // Create and enable FPS lights
            this.createFPSLighting();
            if (this.fpsMainLight) this.fpsMainLight.setEnabled(true);
            if (this.fpsFieldLight) this.fpsFieldLight.setEnabled(true);
            if (this.fpsAmbientLight) this.fpsAmbientLight.setEnabled(true);

            this.currentPerspective = CameraPerspective.FPS_PLAYER1; // Generic FPS
            console.log('🔆 Switched to FPS lighting');
        }
    }

    /**
     * Switch back to top-down lighting configuration
     */
    public switchToTopDownLighting(): void {
        if (this.currentPerspective !== CameraPerspective.TOP_DOWN) {
            // Disable FPS lights
            if (this.fpsMainLight) this.fpsMainLight.setEnabled(false);
            if (this.fpsFieldLight) this.fpsFieldLight.setEnabled(false);
            if (this.fpsAmbientLight) this.fpsAmbientLight.setEnabled(false);

            // Re-enable original lights
            if (this.originalMainLight) {
                this.originalMainLight.setEnabled(true);
            }
            if (this.originalAmbientLight) {
                this.originalAmbientLight.setEnabled(true);
            }

            // Restore original playground material
            if (this.playground && this.playground.material) {
                const material = this.playground.material as BABYLON.StandardMaterial;
                material.diffuseColor = new BABYLON.Color3(0, 0, 0); // Back to black
                material.specularColor = new BABYLON.Color3(0, 0, 0); // No reflection
            }

            this.currentPerspective = CameraPerspective.TOP_DOWN;
            console.log('🔆 Switched to top-down lighting');
        }
    }

    /**
     * Adjust lighting based on camera perspective
     */
    public adjustForPerspective(perspective: CameraPerspective): void {
        switch (perspective) {
            case CameraPerspective.TOP_DOWN:
                this.switchToTopDownLighting();
                break;
            case CameraPerspective.FPS_PLAYER1:
            case CameraPerspective.FPS_PLAYER2:
                this.switchToFPSLighting();
                break;
        }
    }

    /**
     * Fine-tune FPS lighting intensity (for experimentation)
     */
    public adjustFPSLightingIntensity(mainIntensity: number, ambientIntensity: number, fieldIntensity: number = 0.4): void {
        if (this.fpsMainLight) {
            this.fpsMainLight.intensity = mainIntensity;
        }
        if (this.fpsAmbientLight) {
            this.fpsAmbientLight.intensity = ambientIntensity;
        }
        if (this.fpsFieldLight) {
            this.fpsFieldLight.intensity = fieldIntensity;
        }
        console.log(`🔆 FPS lighting adjusted: main=${mainIntensity}, ambient=${ambientIntensity}, field=${fieldIntensity}`);
    }

    /**
     * Get current lighting perspective
     */
    public getCurrentPerspective(): CameraPerspective {
        return this.currentPerspective;
    }

    /**
     * Dispose lighting resources
     */
    public dispose(): void {
        // Dispose FPS lights (don't dispose original lights as they're managed by gameMap)
        if (this.fpsMainLight) {
            this.fpsMainLight.dispose();
            this.fpsMainLight = null;
        }
        if (this.fpsFieldLight) {
            this.fpsFieldLight.dispose();
            this.fpsFieldLight = null;
        }
        if (this.fpsAmbientLight) {
            this.fpsAmbientLight.dispose();
            this.fpsAmbientLight = null;
        }

        // Restore original lighting if we were in FPS mode
        if (this.currentPerspective !== CameraPerspective.TOP_DOWN) {
            this.switchToTopDownLighting();
        }

        console.log('🔆 Lighting controller disposed');
    }
} 