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
    }

    createMap(): void {
        this.canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
        this.setUpEngine();
        this.setUpScene();
        this.setUpPov();
        this.setUpDof();
        this.setUpLight();
        this.createBlackBackground();
    }

    setUpLight(): void {
        if (!this.scene) return;
        
        // Main directional light coming from above to illuminate the playing field
        this.light = new BABYLON.DirectionalLight("mainLight",
            new BABYLON.Vector3(0, -1, 0), // Pointing straight down
            this.scene);
        this.light.position = new BABYLON.Vector3(0, 100, 0); // Positioned above the field
        this.light.intensity = 0.35; // Strong enough to see everything clearly
        
        // Soft ambient light for overall scene visibility
        const ambient = new BABYLON.HemisphericLight("ambientLight",
            new BABYLON.Vector3(0, 1, 0), // From above
            this.scene);
        ambient.intensity = 0.5; // Gentle fill light
        ambient.diffuse = new BABYLON.Color3(0.9, 0.9, 1); // Slightly cool tone
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
        if (this.playgroundMaterial.diffuseTexture) {
            this.playgroundMaterial.diffuseTexture.uOffset = 0;
            this.playgroundMaterial.diffuseTexture.vOffset = 0;
            this.playgroundMaterial.diffuseTexture.uScale = 1;
            this.playgroundMaterial.diffuseTexture.vScale = 1;
        }
        
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

    triggerCameraShake(): Promise<void> {
        return new Promise((resolve) => {
            try {
                if (!this.globalPov || !this.scene) {
                    resolve();
                    return;
                }
                
                const duration = 500; // Half a second
                const intensity = 2; // Shake intensity
                const frequency = 50; // Shake frequency in Hz
                const startTime = Date.now();
                const originalPosition = this.globalPov.position.clone();

                const shake = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = elapsed / duration;

                    if (!this.globalPov || !this.scene) {
                        resolve();
                        return;
                    }

                    if (progress >= 1) {
                        this.globalPov.position.copyFrom(originalPosition);
                        this.scene.render();
                        resolve();
                        return;
                    }

                    const fadeOut = 1 - progress; // Gradually reduce shake intensity
                    const shakeX = Math.sin(elapsed * frequency * 0.001 * Math.PI * 2) * intensity * fadeOut;
                    const shakeZ = Math.cos(elapsed * frequency * 0.001 * Math.PI * 2 * 1.3) * intensity * fadeOut;
                    const shakeY = Math.sin(elapsed * frequency * 0.001 * Math.PI * 2 * 0.7) * intensity * 0.5 * fadeOut;

                    this.globalPov.position.x = originalPosition.x + shakeX;
                    this.globalPov.position.y = originalPosition.y + shakeY;
                    this.globalPov.position.z = originalPosition.z + shakeZ;

                    this.scene.render();
                    requestAnimationFrame(shake);
                };

                requestAnimationFrame(shake);
            } catch (error) {
                console.error('Error during camera shake:', error);
                resolve(); // Resolve anyway to prevent hanging
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
        
        console.log('🗑️ GameMap disposal completed');
    }
}

export {gameMap}; 