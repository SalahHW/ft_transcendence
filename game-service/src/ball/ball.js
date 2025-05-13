import * as BABYLON from '@babylonjs/core';
import { createExplosion } from './ballEffects.js';

class Ball {
    constructor(player1, player2) {
        this.position = new BABYLON.Vector3(0, 1, 0);
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.radius = 1;
        this.rebounds = 0;
        this.wasHitByPlayer = undefined;
        this.ballBody = null;
        this.ballMaterial = null;
        this.glowAnimationInterval = null;
        this.isGlowing = false;
        this.currentGlowIntensity = 0;
        this.currentGlowColor = new BABYLON.Color3(0, 0, 0);
        this.isRespawning = false;
        this.respawnTime = 0;
        this.respawnDuration = 2;
        this.player1 = player1;
        this.player2 = player2;
        // For speed tracking
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
    }

    init() {
        this.position = new BABYLON.Vector3(0, 1, 0);
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.rebounds = 0;
        this.isRespawning = false;
        this.respawnTime = 0;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
        this.setFirstVelocity();
        //console.log(`Ball initialized with velocity: ${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)}`);
    }

    setFirstVelocity() {
        this.velocity = new BABYLON.Vector3(Math.random() >= 0.5 ? 20 : -20, 0, 0);
    }

    createBall(scene) {
        this.ballBody = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 2 }, scene);
        this.ballMaterial = new BABYLON.StandardMaterial("glowMat", scene);
        this.ballBody.position.copyFrom(this.position);
        this.ballBody.material = this.ballMaterial;
    }

    update(deltaTime, paddle1Pos, paddle2Pos) {
        if (this.isRespawning) {
            this.respawnTime += deltaTime;
            this.position.y = -2 + 3 * (this.respawnTime / this.respawnDuration);
            if (this.respawnTime >= this.respawnDuration) {
                this.isRespawning = false;
                this.position.y = 1;
                this.setFirstVelocity();
                //console.log(`Ball respawned with velocity: ${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)}`);
            }
            return;
        }

        // Track speed (units/s)
        const now = Date.now();
        const timeElapsed = (now - this.lastUpdateTime) / 1000; // in seconds
        if (timeElapsed > 0.01) { // Log every ~100ms
            const distance = BABYLON.Vector3.Distance(this.position, this.lastPosition);
            const speed = distance / timeElapsed;
            console.log(`Ball speed: ${speed.toFixed(3)} units/s, pos: (${this.position.x.toFixed(3)}, ${this.position.y.toFixed(3)}, ${this.position.z.toFixed(3)}), vel: (${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)}), rebounds: ${this.rebounds}`);
            this.lastPosition = this.position.clone();
            this.lastUpdateTime = now;
        }

        this.handleAcceleration();
        this.handleWallCollisions();
        this.handlePaddleCollisions(paddle1Pos, paddle2Pos);
        this.position.addInPlace(this.velocity.scale(deltaTime));
        this.handleScoreZone();
    }

    handleWallCollisions() {
        const mapHalfDepth = 10;
        if (this.position.z >= mapHalfDepth - this.radius) {
            this.velocity.z *= -1;
            this.position.z = mapHalfDepth - this.radius;
            //console.log(`Wall hit (z=${mapHalfDepth - this.radius}), velocity: (${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)})`);
        } else if (this.position.z <= -mapHalfDepth + this.radius) {
            this.velocity.z *= -1;
            this.position.z = -mapHalfDepth + this.radius;
            //console.log(`Wall hit (z=${-mapHalfDepth + this.radius}), velocity: (${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)})`);
        }
    }

    handleAcceleration() {
        let speed;
        if (this.rebounds < 5) speed = 25;
        else if (this.rebounds < 10) speed = 37.5;
        else if (this.rebounds < 25) speed = 50;
        else if (this.rebounds < 35) speed = 75;
        else if (this.rebounds < 42) speed = 100;
        else speed = 125;

        // Preserve direction, set magnitude to desired speed (units/s)
        const currentSpeed = this.velocity.length();
        if (currentSpeed > 0) {
            this.velocity = this.velocity.scale(speed / currentSpeed);
        } else {
            // If velocity is zero (e.g., after respawn), maintain initial direction
            this.velocity = new BABYLON.Vector3(this.velocity.x >= 0 ? speed : -speed, 0, this.velocity.z);
        }
        //console.log(`Acceleration applied - rebounds: ${this.rebounds}, target speed: ${speed}, velocity: (${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)})`);
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
            let speed = this.velocity.length(); // Preserve current speed post-acceleration
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
            //console.log(`Paddle hit - player: ${this.wasHitByPlayer}, rebounds: ${this.rebounds}, velocity: (${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)})`);
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
            this.position = new BABYLON.Vector3(wasGoingLeft ? -0.2 : 0.2, -2, 0);
            this.velocity = BABYLON.Vector3.Zero();
            this.isRespawning = true;
            this.respawnTime = 0;
            //console.log(`Score - P1: ${this.player1.playerScore}, P2: ${this.player2.playerScore}, respawning at x=${this.position.x}`);
        }
    }

    startGlowTransition(targetColor, duration) {
        if (!this.ballBody || !this.ballMaterial) return;
        if (this.glowAnimationInterval) clearInterval(this.glowAnimationInterval);
        const startColor = this.currentGlowColor.clone();
        const startTime = Date.now();
        this.glowAnimationInterval = setInterval(() => {
            const progress = Math.min(1, (Date.now() - startTime) / duration);
            this.currentGlowColor = BABYLON.Color3.Lerp(startColor, targetColor, progress);
            this.ballMaterial.emissiveColor = this.currentGlowColor;
            if (progress >= 1) {
                clearInterval(this.glowAnimationInterval);
                this.glowAnimationInterval = null;
                this.isGlowing = true;
            }
        }, 16);
    }

    updateClient(scene) {
        if (this.ballBody) {
            this.ballBody.position.copyFrom(this.position);
        }
        if (this.rebounds >= 25 && !this.isGlowing) {
            this.startGlowTransition(new BABYLON.Color3(0.5, 0.2, 0), 1500);
        } else if (this.rebounds >= 42) {
            this.startGlowTransition(new BABYLON.Color3(1, 1, 0.3), 8500);
        }
        if (this.rebounds > 55 && this.wasHitByPlayer) {
            createExplosion(scene, this.position);
            this.wasHitByPlayer = false;
        }
    }

    setState(state) {
        this.position.copyFrom(state.position);
        this.velocity.copyFrom(state.velocity);
        this.rebounds = state.rebounds;
        this.isRespawning = state.isRespawning;
        this.respawnTime = state.respawnTime;
        this.wasHitByPlayer = state.wasHitByPlayer;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
        //console.log(`Client ball state updated - pos: (${this.position.x.toFixed(3)}, ${this.position.y.toFixed(3)}, ${this.position.z.toFixed(3)}), vel: (${this.velocity.x.toFixed(3)}, ${this.velocity.y.toFixed(3)}, ${this.velocity.z.toFixed(3)})`);
    }
}

export { Ball };