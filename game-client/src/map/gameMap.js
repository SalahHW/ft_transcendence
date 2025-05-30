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
        this.pipeline.depthOfField.focusDistance = 50; // Distance from camera in units (tune as needed)
        this.pipeline.depthOfField.focalLength = 50;   // Lens focal length (higher = stronger effect)
        this.pipeline.depthOfField.fStop = 1.8;         // Aperture (lower = stronger blur)
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
    //displayScore() {

    //}
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

                            // Ensure scene renders during animation
                            this.scene.render();
                            
                            if (t >= 1) {
                                currentStep++;
                                animationStartTime = Date.now();
                            }
                            
                            requestAnimationFrame(updateYPosition);
                        } else {
                            // Ensure final position is set
                            this.globalPov.position.y = steps[steps.length - 1];
                            // Disable depth of field for gameplay
                            if (this.pipeline) {
                                this.pipeline.depthOfFieldEnabled = false;
                            }
                            // Final render with gameplay settings
                            this.scene.render();
                            // Signal animation completion
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

    // Add method to prepare for gameplay
    prepareForGameplay() {
        // Disable depth of field
        if (this.pipeline) {
            this.pipeline.depthOfFieldEnabled = false;
        }

        // Set final camera position
        this.globalPov.position.y = 50;
        
        // Ensure camera is properly positioned and configured
        this.globalPov.setTarget(BABYLON.Vector3.Zero());
        
        // Make sure the scene is ready for gameplay
        this.scene.render();
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