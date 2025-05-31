import * as BABYLON from '@babylonjs/core';
import { playerPaddle } from '../player/player';
import "@babylonjs/core/PostProcesses/depthOfFieldEffect";
import "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManager";
import "@babylonjs/core/Rendering/depthRenderer";

class gameMap {
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
    createMap () {
        this.canvas = document.getElementById('renderCanvas');
        this.setUpEngine();
        this.setUpScene();
        this.setUpPov();
        this.setUpDof();
        this.setUpLight();
    }
    setUpLight() {
        this.light = new BABYLON.DirectionalLight("light",
            new BABYLON.Vector3(0, -1, 0),
            this.scene);
        this.light.position = new BABYLON.Vector3(-80, 80, 0);
        this.light.intensity = 0.5;
        const ambient = new BABYLON.HemisphericLight("ambient",
            new BABYLON.Vector3(0, 100, 0), // From sky
            this.scene);
        ambient.intensity = 0.3;
    }
    setUpEngine() {
        this.engine = new BABYLON.Engine(this.canvas);
    }
    setUpScene() {
        this.scene = new BABYLON.Scene(this.engine);
    }
    setUpPov() {
        this.globalPov = new BABYLON.UniversalCamera('pov',
            new BABYLON.Vector3(0, 1500, 0),
            this.scene);
        this.globalPov.setTarget(BABYLON.Vector3.Zero());
        this.disableCameraConstrols();
    }
    disableCameraConstrols () {
        this.globalPov.inputs.removeMouse();
        this.globalPov.inputs.removeByType("FreeCameraKeyboardMoveInput");
        this.globalPov.attachControl(this.canvas, false);
    }
    setUpDof() {
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
        this.pipeline.depthOfField.blurLevel = BABYLON.DepthOfFieldEffectBlurLevel.Medium; // Low/Medium/High

    }
    createSkyBox (scene){
        this.skyBox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 150 }, scene);
        const skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/skybox", scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        this.skyBox.material = skyboxMaterial;
    }
    createShadowCaster(ball, player1, player2) {
        this.shadowGenerator = new BABYLON.ShadowGenerator(4096, this.light);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.addShadowCaster(ball);
        this.shadowGenerator.addShadowCaster(player1);
        this.shadowGenerator.addShadowCaster(player2);
        this.shadowGenerator.setDarkness(0.2);
        this.playground.receiveShadows = true;
    }
    createPlayground() {
        this.playground = BABYLON.MeshBuilder.CreateBox("playground", {
            width: 40,
            height: 0.5,
            depth: 20
        }, this.scene);
        this.playgroundMaterial = new BABYLON.StandardMaterial("groundmat", this.scene);
        this.playgroundMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        this.playground.material = this.playgroundMaterial;
    }

    gameStateHandler(player1, player2) {
        console.log("state playerscore 1 = ", player1.getPlayerScore);
        console.log("state playerscore 2 = ", player2.getPlayerScore);
        if (player1.getPlayerScore > 10 && player2.getPlayerScore < player1.getPlayerScore) {
            player1.setPlayerWinner = true;
            player2.setPlayerWinner = false;
            console.log("PLAYER1 WINNER");
        } else if (player2.getPlayerScore > 10 && player1.getPlayerScore < player2.getPlayerScore) {
            player2.setPlayerWinner = true;
            player1.setPlayerWinner = false;
            console.log("PLAYER2 WINNER");
        }
    }
    updateCurrentDof(currentY) {
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
    
    smoothlyDisableDof(duration) {
        return new Promise((resolve) => {
            if (!this.pipeline || !this.pipeline.depthOfFieldEnabled) {
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
    
    launchMatchAnimation() {
        return new Promise((resolve, reject) => {
            try {
                const steps = [500, 250, 50];
                let currentStep = 0;
                let animationStartTime = Date.now();
        
                const updateYPosition = () => {
                    try {
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

    get getEngine() {
        return this.engine;
    }

    get getScene() {
        return this.scene;
    }

    get getPlayground() {
        return this.playground;
    }
    get getGlobalPovY() {
        return this.globalPov.position.y;
    }
}

export {gameMap};