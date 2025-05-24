import * as BABYLON from '@babylonjs/core';
import { createExplosion } from './ballEffects.js';

class Ball {
    constructor(player1, player2) {
        this.position = new BABYLON.Vector3(0, -2, 0);
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.previousVelocity = new BABYLON.Vector3(0, 0, 0);
        this.radius = 1;
        this.rebounds = 0;
        this.wasHitByPlayer = undefined;
        this.ballBody = null;
        this.ballMaterial = null;
        this.isGlowing = false;
        this.currentGlowColor = new BABYLON.Color3(0, 0, 0);
        this.isRespawning = true;
        this.respawnTime = 0;
        this.respawnDuration = 2;
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
        this.isRespawning = true;
        this.respawnTime = 0;
        this.hasValidPosition = true;
        this.speed = 25;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
    }

    setFirstVelocity() {
        this.velocity = new BABYLON.Vector3(Math.random() >= 0.5 ? 20 : -20, 0, 0);
        this.previousVelocity.copyFrom(this.velocity);
        this.speed = 25;
    }

    createBall(scene) {
        this.ballBody = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 2 }, scene);
        this.ballMaterial = new BABYLON.StandardMaterial("glowMat", scene);
        this.ballBody.position.copyFrom(this.position);
        this.ballBody.material = this.ballMaterial;
        this.ballBody.isVisible = true;
    }

    handleBallRespawn(previousVelocity) {
        this.position = new BABYLON.Vector3(0, -2, 0); // Center for initial spawn
        this.velocity = BABYLON.Vector3.Zero();
        this.previousVelocity.copyFrom(previousVelocity);
        this.isRespawning = true;
        this.respawnTime = 0;
        this.hasValidPosition = true;
        this.speed = 25;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
        console.log('handleBallRespawn called:', { position: this.position, isRespawning: this.isRespawning, respawnTime: this.respawnTime });
    }

    update(deltaTime, paddle1Pos, paddle2Pos) {
        if (this.isRespawning) {
            this.respawnTime += deltaTime;
            const t = Math.min(this.respawnTime / this.respawnDuration, 1);
            this.position.y = -2 + 3 * t;
            this.position.z = 0;
            this.position.x = this.position.x;
            //console.log(`Respawn animation: t=${t}, position.y=${this.position.y}, respawnTime=${this.respawnTime}`);
            if (t >= 1) {
                this.isRespawning = false;
                this.position.y = 1;
                this.velocity.copyFrom(this.previousVelocity);
                if (this.velocity.length() === 0) {
                    this.setFirstVelocity();
                }
                this.hasValidPosition = true;
                this.speed = this.rebounds < 5 ? 25 : 37.5;
                console.log('Respawn complete:', { position: this.position, velocity: this.velocity });
            }
            return;
        }

        const now = Date.now();
        const timeElapsed = (now - this.lastUpdateTime) / 1000;
        if (timeElapsed > 0.01) {
            this.lastPosition = this.position.clone();
            this.lastUpdateTime = now;
        }

        this.handleAcceleration();
        this.handleWallCollisions();
        this.handlePaddleCollisions(paddle1Pos, paddle2Pos);
        this.position.addInPlace(this.velocity.scale(deltaTime));
        this.position.x = Number(this.position.x.toFixed(6));
        this.position.y = Number(this.position.y.toFixed(6));
        this.position.z = Number(this.position.z.toFixed(6));
        this.handleScoreZone();
    }

    handleWallCollisions() {
        const mapHalfDepth = 10;
        if (this.position.z >= mapHalfDepth - this.radius) {
            this.velocity.z *= -1;
            this.position.z = mapHalfDepth - this.radius;
        } else if (this.position.z <= -mapHalfDepth + this.radius) {
            this.velocity.z *= -1;
            this.position.z = -mapHalfDepth + this.radius;
        }
    }

    handleAcceleration() {
        let speed;
        if (this.rebounds < 5) speed = 25;
        else speed = 37.5;

        const currentSpeed = this.velocity.length();
        if (currentSpeed > 0) {
            this.velocity = this.velocity.scale(speed / currentSpeed);
        } else {
            this.velocity = new BABYLON.Vector3(this.velocity.x >= 0 ? speed : -speed, 0, this.velocity.z);
        }
        this.previousVelocity.copyFrom(this.velocity);
        this.speed = speed;
    }

    handlePaddleCollisions(paddle1Pos, paddle2Pos) {
        const isPaddle2 = this.velocity.x < 0;
        const paddle = isPaddle2 ? paddle2Pos : paddle1Pos;
        const dx = this.position.x - paddle.x;
        const dz = this.position.z - paddle.z;
        const paddleHalfWidth = 0.5;
        const paddleHalfDepth = 2.5;

        const overlapX = Math.abs(dx) <= paddleHalfWidth + this.radius;
        const overlapZ = Math.abs(dz) <= paddleHalfDepth + this.radius;

        if (overlapX && overlapZ) {
            this.rebounds++;
            this.wasHitByPlayer = isPaddle2 ? this.player2.playerId : this.player1.playerId;
            const isSideHit = Math.abs(dz) > paddleHalfDepth;
            let speed = this.velocity.length();
            if (isSideHit) {
                this.velocity.z *= -1;
                const sign = dz > 0 ? 1 : -1;
                this.position.z += sign * ((paddleHalfDepth + this.radius) - Math.abs(dz) + 0.01);
            } else {
                const clampedOffset = Math.max(-paddleHalfDepth, Math.min(paddleHalfDepth, dz));
                const normalized = clampedOffset / paddleHalfDepth;
                const angle = normalized * Math.PI / 4;
                this.velocity = new BABYLON.Vector3(
                    Math.cos(angle),
                    0,
                    Math.sin(angle)
                ).normalize().scale(speed);
                this.velocity.x = isPaddle2 ? Math.abs(this.velocity.x) : -Math.abs(this.velocity.x);
                const sign = dx > 0 ? 1 : -1;
                this.position.x += sign * ((paddleHalfWidth + this.radius) - Math.abs(dx) + 0.01);
            }
            this.previousVelocity.copyFrom(this.velocity);
            this.speed = this.rebounds < 5 ? 25 : 37.5;
        }
    }

    handleScoreZone() {
        if (Math.abs(this.position.x) > 20) {
            const wasGoingLeft = this.velocity.x < 0;
            if (this.position.x < 0) {
                this.player2.playerScore++;
            } else {
                this.player1.playerScore++;
            }
            const newVelocity = new BABYLON.Vector3(wasGoingLeft ? -25 : 25, 0, 0);
            this.handleBallRespawn(newVelocity);
        }
    }

    startGlowTransition(targetColor, duration, scene) {
        if (!this.ballBody || !this.ballMaterial) return;
        const startColor = this.currentGlowColor.clone();
        const glowAnimation = new BABYLON.Animation(
            "glowAnimation",
            "emissiveColor",
            60,
            BABYLON.Animation.ANIMATIONTYPE_COLOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        const keys = [
            { frame: 0, value: startColor },
            { frame: 60 * (duration / 1000), value: targetColor }
        ];
        glowAnimation.setKeys(keys);
        this.ballMaterial.animations = [glowAnimation];
        scene.beginAnimation(this.ballMaterial, 0, 60 * (duration / 1000), false, 1, () => {
            this.currentGlowColor = targetColor;
            this.isGlowing = true;
        });
    }

    updateClient(scene) {
        if (this.ballBody && this.hasValidPosition) {
            this.ballBody.position.copyFrom(this.position);
            this.ballBody.isVisible = true;
        } else if (this.ballBody) {
            this.ballBody.isVisible = false;
        }
    }

    setState(state) {
        this.position.copyFrom(state.position);
        this.velocity.copyFrom(state.velocity);
        this.previousVelocity.copyFrom(state.previousVelocity || this.velocity);
        this.rebounds = state.rebounds || 0;
        this.isRespawning = state.isRespawning || false;
        this.respawnTime = state.respawnTime || 0;
        this.wasHitByPlayer = state.wasHitByPlayer;
        this.hasValidPosition = state.hasValidPosition;
        this.speed = state.speed || 25;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
        if (state.isInitialSpawn) {
            this.position = new BABYLON.Vector3(0, -2, 0);
            this.isRespawning = true;
            this.respawnTime = 0;
            this.hasValidPosition = true;
        }
    }
}

export { Ball };