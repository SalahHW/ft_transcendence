import * as BABYLON from '@babylonjs/core';
import { createExplosion } from './ballEffects.js';

class Ball {
    constructor(player1, player2) {
        this.position = new BABYLON.Vector3(0, -2, 0);
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.previousVelocity = new BABYLON.Vector3(0, 0, 0);
        this.radius = 0.75;
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
        this.speed = 25;
    }

    init() {
        this.position = new BABYLON.Vector3(0, -2, 0);
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.previousVelocity = new BABYLON.Vector3(0, 0, 0);
        this.rebounds = 0;
        this.isRespawning = false;
        this.respawnTime = 0;
        this.hasValidPosition = true;
        this.speed = 25;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
        if (this.ballBody) {
            this.ballBody.position = new BABYLON.Vector3(0, -2, 0);
            this.ballBody.isVisible = false;
        }
    }

    createBall(scene) {
        this.ballBody = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 1.5 }, scene);
        this.ballMaterial = new BABYLON.StandardMaterial("glowMat", scene);
        this.position = new BABYLON.Vector3(0, -2, 0);
        this.ballBody.position = new BABYLON.Vector3(0, -2, 0);
        this.ballBody.material = this.ballMaterial;
        this.ballBody.isVisible = false;
    }

    updateClient(scene) {
        if (this.ballBody && this.hasValidPosition) {
            this.ballBody.position.copyFrom(this.position);
            this.ballBody.isVisible = this.isRespawning || this.position.y >= -2;
        }
    }

    setState(state) {
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

        this.rebounds = state.rebounds || 0;
        this.isRespawning = state.isRespawning || false;
        this.respawnTime = state.respawnTime || 0;
        this.wasHitByPlayer = state.wasHitByPlayer;
        this.hasValidPosition = true;
        this.speed = state.speed || 25;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();

        if (this.ballBody) {
            this.ballBody.position.copyFrom(this.position);
            this.ballBody.isVisible = this.isRespawning || this.position.y >= -2;
        }
    }
}

export { Ball };