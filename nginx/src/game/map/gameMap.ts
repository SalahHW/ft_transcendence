import * as BABYLON from '@babylonjs/core';
import { playerPaddle } from '../player/player.js';
import "@babylonjs/core/PostProcesses/depthOfFieldEffect";
import "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManager";
import "@babylonjs/core/Rendering/depthRenderer";

class gameMap {
    public engine: BABYLON.Engine | undefined;
    public canvas: HTMLCanvasElement | undefined;
    public scene: BABYLON.Scene | undefined;
    public playground: BABYLON.Mesh | undefined;
    public playgroundMaterial: BABYLON.StandardMaterial | undefined;
    public globalPov: BABYLON.UniversalCamera | undefined;
    public light: BABYLON.DirectionalLight | undefined;
    public shadowGenerator: BABYLON.ShadowGenerator | undefined;
    public skyBox: BABYLON.Mesh | undefined;
    public pipeline: BABYLON.DefaultRenderingPipeline | undefined;
    public starMeshes: BABYLON.Mesh[] = [];

    constructor() {
        this.engine = undefined;
        this.canvas = undefined;
        this.scene = undefined;
        this.playground = undefined;
        this.playgroundMaterial = undefined;
        this.globalPov = undefined;
        this.light = undefined;
        this.shadowGenerator = undefined;
        this.skyBox = undefined;
        this.pipeline = undefined;
        this.starMeshes = [];
    }

    createMap(): void {
        const canvasElement = document.getElementById('renderCanvas');
        if (!(canvasElement instanceof HTMLCanvasElement)) {
            throw new Error('renderCanvas element not found or is not a canvas');
        }
        this.canvas = canvasElement;
        this.setUpEngine();
        this.setUpScene();
        this.setUpPov();
        this.setUpDof();
        this.setUpLight();
        this.createStarField();
    }

    createStarField(): void {
        if (!this.scene) return;
        
        // Ensure the scene has a proper black background
        this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
        
        // Create star material
        const starMaterial = new BABYLON.StandardMaterial("starMaterial", this.scene);
        starMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
        starMaterial.disableLighting = true;

        // Create individual star meshes for better visibility
        for (let i = 0; i < 1000; i++) {
            const star = BABYLON.MeshBuilder.CreateSphere(`star_${i}`, {
                diameter: 2 + Math.random() * 3, // Random size between 2-5
                segments: 8
            }, this.scene);
            
            // Position stars in a large sphere around the game area
            const radius = 400 + Math.random() * 1600; // Distance from center: 400-2000
            const theta = Math.random() * Math.PI * 2; // Random angle around Y axis
            const phi = Math.acos(2 * Math.random() - 1); // Random angle from Y axis
            
            star.position = new BABYLON.Vector3(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.cos(phi),
                radius * Math.sin(phi) * Math.sin(theta)
            );
            
            // Apply material
            star.material = starMaterial;
            
            // Store reference for cleanup
            this.starMeshes.push(star);
        }
        
        // Create rotating star field animation
        this.createStarFieldRotation();
        
        console.log('⭐ Star field created successfully with 1000 rotating stars');
    }

    createStarFieldRotation(): void {
        if (!this.scene) return;
        
        // Create a parent mesh to rotate all stars together
        const starFieldParent = BABYLON.MeshBuilder.CreateBox("starFieldParent", { size: 0.1 }, this.scene);
        starFieldParent.isVisible = false; // Make parent invisible
        
        // Parent all stars to the rotating parent
        this.starMeshes.forEach(star => {
            star.setParent(starFieldParent);
        });
        
        // Create rotation animation
        const rotationAnimation = new BABYLON.Animation(
            "starFieldRotation",
            "rotation.y",
            30, // 30 FPS
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        // Define keyframes for smooth rotation - much slower
        const keyFrames = [
            { frame: 0, value: 0 },
            { frame: 4200, value: Math.PI * 2 } // Full 360-degree rotation over 60 seconds
        ];
        rotationAnimation.setKeys(keyFrames);
        
        // Apply animation to parent mesh
        starFieldParent.animations = [rotationAnimation];
        
        // Start the animation
        this.scene.beginAnimation(starFieldParent, 0, 4200, true);
        
        console.log('🔄 Star field rotation animation started');
    }

    setUpLight(): void {
        if (!this.scene) return;
        
        // 🔆 UNIFIED REALISTIC LIGHTING - works for both top-down animation and FPS gameplay
        
        // Main directional light - realistic overhead lighting with slight angle for depth
        this.light = new BABYLON.DirectionalLight("realisticMainLight",
            new BABYLON.Vector3(0.1, -0.9, 0.1), // Slightly angled from above for realistic shadows
            this.scene);
        this.light.position = new BABYLON.Vector3(10, 120, 10); // High above with slight offset
        this.light.intensity = 0.7; // Strong enough for good visibility in both views
        this.light.diffuse = new BABYLON.Color3(1, 0.98, 0.95); // Warm white light
        
        // Realistic ambient light - simulates sky/environment lighting
        const ambient = new BABYLON.HemisphericLight("environmentLight",
            new BABYLON.Vector3(0, 1, 0), // From above (sky)
            this.scene);
        ambient.intensity = 0.4; // Balanced fill light
        ambient.diffuse = new BABYLON.Color3(0.85, 0.9, 1); // Cool sky tone
        ambient.groundColor = new BABYLON.Color3(0.3, 0.3, 0.35); // Subtle ground reflection
        
        console.log('🔆 Unified realistic lighting system initialized');
    }

    setUpEngine(): void {
        if (!this.canvas) return;
        this.engine = new BABYLON.Engine(this.canvas, true, {antialias: true});
    }

    setUpScene(): void {
        if (!this.engine) return;
        this.scene = new BABYLON.Scene(this.engine);
    }

    setUpPov(): void {
        if (!this.scene) return;
        
        this.globalPov = new BABYLON.UniversalCamera('pov',
            new BABYLON.Vector3(0, 1500, 0),
            this.scene);
        this.globalPov.setTarget(BABYLON.Vector3.Zero());
        this.disableCameraConstrols();
    }

    disableCameraConstrols(): void {
        if (!this.globalPov || !this.canvas) return;
        
        this.globalPov.inputs.removeMouse();
        this.globalPov.inputs.removeByType("FreeCameraKeyboardMoveInput");
        this.globalPov.attachControl(this.canvas, false);
    }

    setUpDof(): void {
        if (!this.scene || !this.globalPov) return;
        
        this.pipeline = new BABYLON.DefaultRenderingPipeline(
            "defaultPipeline",
            true,
            this.scene,
            [this.globalPov] // Camera
        );
        this.pipeline.depthOfFieldEnabled = true;
        this.pipeline.depthOfField.focusDistance = 50; 
        this.pipeline.depthOfField.focalLength = 50;
        this.pipeline.depthOfField.fStop = 1.8;      
        this.pipeline.fxaaEnabled = true; 
    }

    createSkyBox(scene: BABYLON.Scene): void {
        this.skyBox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 150 }, scene);
        const skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("./textures/skybox", scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        this.skyBox.material = skyboxMaterial;
    }

    createBlackBackground(): void {
        if (!this.scene) return;
        this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    }

    createShadowCaster(ball: BABYLON.Mesh, player1: BABYLON.Mesh, player2: BABYLON.Mesh): void {
        if (!this.light || !this.playground) return;
        
        this.shadowGenerator = new BABYLON.ShadowGenerator(4096, this.light);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.addShadowCaster(ball);
        this.shadowGenerator.addShadowCaster(player1);
        this.shadowGenerator.addShadowCaster(player2);
        this.shadowGenerator.setDarkness(0.2);
        this.playground.receiveShadows = true;
    }

    createPlayground(): void {
        if (!this.scene) return;
        
        this.playground = BABYLON.MeshBuilder.CreateBox("playground", {
            width: 40,
            height: 0.5,
            depth: 20
        }, this.scene);
        this.playgroundMaterial = new BABYLON.StandardMaterial("groundmat", this.scene);
        
        // 🏓 Load the pong table texture for the floor
        this.playgroundMaterial.diffuseTexture = new BABYLON.Texture("./textures/floor/pong-table.jpg", this.scene);
        
        // Ensure proper texture scaling and orientation
        if (this.playgroundMaterial.diffuseTexture instanceof BABYLON.Texture) {
            this.playgroundMaterial.diffuseTexture.uOffset = 0;
            this.playgroundMaterial.diffuseTexture.vOffset = 0;
            this.playgroundMaterial.diffuseTexture.uScale = 1;
            this.playgroundMaterial.diffuseTexture.vScale = 1;
        }
        
        // 🔆 Enhanced material properties for realistic lighting
        this.playgroundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Subtle reflection
        this.playgroundMaterial.specularPower = 32; // Surface smoothness
        this.playgroundMaterial.ambientColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Helps with ambient lighting
        
        this.playground.material = this.playgroundMaterial;
    }

    gameStateHandler(player1: playerPaddle, player2: playerPaddle): void {
        if (player1.getPlayerScore > 10 && player2.getPlayerScore < player1.getPlayerScore) {
            player1.playerWinner = true;
            player2.playerWinner = false;
            console.log("PLAYER1 WINNER");
        } else if (player2.getPlayerScore > 10 && player1.getPlayerScore < player2.getPlayerScore) {
            player2.playerWinner = true;
            player1.playerWinner = false;
            console.log("PLAYER2 WINNER");
        }
    }

    updateCurrentDof(currentY: number): void {
        try {
            if (this.pipeline && this.pipeline.depthOfField) {
                // Adjust DOF parameters based on camera height
                this.pipeline.depthOfField.focusDistance = currentY / 10;
                this.pipeline.depthOfField.focalLength = Math.max(50, currentY / 5);
                this.pipeline.depthOfField.fStop = Math.max(1.4, currentY / 100);
            }
        } catch (error) {
            console.error('Error updating depth of field:', error);
        }
    }
    
    smoothlyDisableDof(duration: number): Promise<void> {
        return new Promise((resolve) => {
            if (!this.pipeline || !this.pipeline.depthOfFieldEnabled || !this.scene) {
                resolve();
                return;
            }

            const startTime = Date.now();
            const initialFocalLength = this.pipeline.depthOfField.focalLength;
            const initialFStop = this.pipeline.depthOfField.fStop;
            const initialFocusDistance = this.pipeline.depthOfField.focusDistance;

            const updateDof = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                if (!this.pipeline || !this.scene) {
                    resolve();
                    return;
                }
                
                // Linear interpolation for all parameters
                this.pipeline.depthOfField.focalLength = initialFocalLength * (1 - progress);
                this.pipeline.depthOfField.fStop = initialFStop + (8 - initialFStop) * progress;
                this.pipeline.depthOfField.focusDistance = initialFocusDistance * (1 - progress);

                this.scene.render();

                if (progress < 1) {
                    requestAnimationFrame(updateDof);
                } else {
                    this.pipeline.depthOfFieldEnabled = false;
                    this.scene.render();
                    resolve();
                }
            };
            requestAnimationFrame(updateDof);
        });
    }
    
    launchMatchAnimation(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const steps = [500, 250, 50];
                let currentStep = 0;
                let animationStartTime = Date.now();
        
                const updateYPosition = () => {
                    try {
                        if (!this.globalPov || !this.scene) {
                            reject(new Error('Missing required objects for animation'));
                            return;
                        }
                        
                        if (currentStep < steps.length) {
                            const currentY = steps[currentStep];
                            // Smoothly interpolate to the target position
                            const currentPos = this.globalPov.position.y;
                            const targetPos = currentY;
                            const t = Math.min((Date.now() - animationStartTime) / 1000, 1);
                            this.globalPov.position.y = currentPos + (targetPos - currentPos) * t;
                            
                            if (this.pipeline && this.pipeline.depthOfField) {
                                this.updateCurrentDof(this.globalPov.position.y);
                            }
                            this.scene.render();
                            
                            if (t >= 1) {
                                currentStep++;
                                animationStartTime = Date.now();
                            }
                            
                            requestAnimationFrame(updateYPosition);
                        } else {
                            this.globalPov.position.y = steps[steps.length - 1];
                            this.smoothlyDisableDof(1000);
                            resolve();
                        }
                    } catch (error) {
                        console.error('Error during camera animation step:', error);
                        reject(error);
                    }
                };
        
                // Start the animation immediately
                requestAnimationFrame(updateYPosition);
            } catch (error) {
                console.error('Error initializing camera animation:', error);
                reject(error);
            }
        });
    }

    get getEngine(): BABYLON.Engine | undefined {
        return this.engine;
    }

    get getScene(): BABYLON.Scene | undefined {
        return this.scene;
    }

    get getPlayground(): BABYLON.Mesh | undefined {
        return this.playground;
    }
    
    get getGlobalPovY(): number {
        return this.globalPov?.position.y || 0;
    }

    /**
     * Properly dispose of the scene and engine to clean up resources
     */
    dispose(): void {
        console.log('🗑️ Disposing gameMap resources...');
        
        // Stop render loop if running
        if (this.engine) {
            this.engine.stopRenderLoop();
        }

        // Dispose star field
        if (this.starMeshes.length > 0) {
            // Find and dispose of the parent mesh first
            const starFieldParent = this.scene?.getMeshByName("starFieldParent");
            if (starFieldParent) {
                try {
                    starFieldParent.dispose();
                    console.log('🔄 Star field parent disposed');
                } catch (e) {
                    console.warn('Warning during star field parent disposal:', e);
                }
            }
            
            // Dispose individual star meshes
            this.starMeshes.forEach(star => {
                try {
                    star.dispose();
                } catch (e) {
                    console.warn(`Warning during star mesh disposal: ${star.name}`, e);
                }
            });
            this.starMeshes = [];
            console.log('⭐ All star meshes disposed');
        }

        // Dispose scene and all its resources
        if (this.scene) {
            try {
                this.scene.dispose();
                console.log('🗑️ Scene disposed');
            } catch (e) {
                console.warn('Warning during scene disposal:', e);
            }
        }

        // Dispose engine
        if (this.engine) {
            try {
                this.engine.dispose();
                console.log('🗑️ Engine disposed');
            } catch (e) {
                console.warn('Warning during engine disposal:', e);
            }
        }

        // Clear all references
        this.scene = undefined;
        this.engine = undefined;
        this.canvas = undefined;
        this.playground = undefined;
        this.playgroundMaterial = undefined;
        this.globalPov = undefined;
        this.light = undefined;
        this.shadowGenerator = undefined;
        this.skyBox = undefined;
        this.pipeline = undefined;
        this.starMeshes = [];
        
        console.log('🗑️ GameMap disposal completed');
    }
}

export {gameMap}; 