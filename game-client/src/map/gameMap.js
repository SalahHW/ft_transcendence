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
        if (this.depthOfFieldEffect) {
            this.depthOfFieldEffect.focusDistance = currentY;
        }
        if (currentY === 50 && this.pipeline) {
            this.pipeline.depthOfFieldEnabled = false;
        }
    }
    
    launchMatchAnimation() {
        return new Promise((resolve) => {
            const steps = [500, 250, 50];
            let currentStep = 0;
    
            const updateYPosition = () => {
                if (currentStep < steps.length) {
                    const currentY = steps[currentStep];
                    this.globalPov.position.y = currentY;
                    this.updateCurrentDof(currentY);
                    currentStep++;
                    setTimeout(updateYPosition, 1000);
                } else {
                    resolve();
                }
            };
    
            setTimeout(updateYPosition, 1000); // Start after 1 second
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