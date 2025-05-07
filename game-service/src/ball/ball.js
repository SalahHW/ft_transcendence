import * as BABYLON from '@babylonjs/core';
import { playerPaddle as paddle} from '../player/player.js';
import { createExplosion } from './ballEffects.js';

class ball {
    constructor() {
        this.ballBody = undefined;
        this.ballRadius = undefined;
        this.ballVelocity = new BABYLON.Vector3(0, 0, 0);;
        this.ballMaterial = undefined;
        this.rebounds = 0;
        this.glowAnimationInterval = null;
        this.isGlowing = false; // Track glow state
        this.currentGlowIntensity = 0; // Tracks current glow strength (0-1)
        this.currentGlowColor = new BABYLON.Color3(0, 0, 0); // Track current color
        this.wasHitByPlayer = undefined;
    }
    createBall(scene) {
        const diameter = 2;
        this.ballBody = BABYLON.MeshBuilder.CreateSphere("ball", { diameter }, scene);
        this.ballMaterial = new BABYLON.StandardMaterial("glowMat", scene);
        this.ballRadius = diameter / 2;
        this.ballBody.position = new BABYLON.Vector3(0, 1, 0);
        this.setFirstBallVelocity();
        this.handleBallRespawn(this.ballVelocity);
    }
    set ballVel(velocity) {
        this.ballVelocity = velocity;
    }
    setFirstBallVelocity() {
        this.ballVelocity = new BABYLON.Vector3(Math.random() >= 0.5 ? 0.2 : -0.2, 
        0, 
        0);
    }
    handleBallWallCollisions() {
        const mapHalfDepth = 10;
        const ballZ = this.ballBody.position.z;

        if (ballZ >= mapHalfDepth - this.ballRadius) {
            this.ballVelocity.z *= -1;
            this.ballBody.position.z = mapHalfDepth - this.ballRadius;
        } else if (ballZ <= -mapHalfDepth + this.ballRadius) {
            this.ballVelocity.z *= -1;
            this.ballBody.position.z = -mapHalfDepth + this.ballRadius;
        }
    }
    handleBallAcceleration() {
        let speed = this.ballVelocity.length();
        if (this.rebounds >= 5 && this.rebounds < 10) {
            speed = 0.3;
        } else if (this.rebounds > 10 && this.rebounds < 25) {
            speed = 0.4;
        } else if (this.rebounds > 25 && this.rebounds < 35) {
            speed = 0.6;
            if (!this.isGlowing) {
                this.startGlowTransition(
                    new BABYLON.Color3(0.5, 0.2, 0), 1500);
            }
        } else if (this.rebounds > 42) {
            speed = 0.8;
            this.startGlowTransition(
                new BABYLON.Color3(1, 1, 0.3), 8500);
        } else if (this.rebounds > 69) {
            speed = 1;
        }
        this.ballVelocity = this.ballVelocity.normalize().scale(speed);
    }

    startGlowTransition(targetColor, duration) {
        // Clear any existing animation
        if (this.glowAnimationInterval) {
            clearInterval(this.glowAnimationInterval);
        }

        // Ensure material is assigned
        if (!this.ballBody.material) {
            this.ballBody.material = this.ballMaterial;
            this.ballMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0);
        }

        const startColor = this.currentGlowColor.clone();
        const startTime = Date.now();
        const endTime = startTime + duration;

        this.glowAnimationInterval = setInterval(() => {
            const now = Date.now();
            const progress = Math.min(1, (now - startTime) / duration);
            
            this.currentGlowColor = new BABYLON.Color3(
                startColor.r + (targetColor.r - startColor.r) * progress,
                startColor.g + (targetColor.g - startColor.g) * progress,
                startColor.b + (targetColor.b - startColor.b) * progress
            );

            this.ballBody.material.emissiveColor = this.currentGlowColor;

            if (progress >= 1) {
                clearInterval(this.glowAnimationInterval);
                this.glowAnimationInterval = null;
                this.isGlowing = true;
            }
        }, 16); // ~60fps
    }
    handleBallReboundPaddles(ball, speed, paddle1, paddle2, halfDepth, paddleFrontMargin, scene) {
        let isPaddle2 = this.ballVelocity.x < 0;
        const paddle = isPaddle2 ? paddle2.paddleBody.position : paddle1.paddleBody.position;
    
        const dx = ball.x - paddle.x;
        const dz = ball.z - paddle.z;
    
        const paddleHalfWidth = paddleFrontMargin;
        const paddleHalfDepth = halfDepth;
    
        const overlapX = Math.abs(dx) <= paddleHalfWidth + this.ballRadius;
        const overlapZ = Math.abs(dz) <= paddleHalfDepth + this.ballRadius;
    
        if (overlapX && overlapZ) {
            this.ballVelocity.x < 0 ? paddle2.incrementPlayerRebounds() : paddle1.incrementPlayerRebounds();
            if (this.rebounds > 55) {
                createExplosion(scene, paddle);
            }
            const isSideHit = Math.abs(dz) > paddleHalfDepth;
            if (isSideHit) {
                this.ballVelocity.z *= -1;
    
                const sign = dz > 0 ? 1 : -1;
                const penetration = (paddleHalfDepth + this.ballRadius) - Math.abs(dz);
                this.ballBody.position.z += sign * (penetration + 0.01);
            } else {
                const clampedOffset = Math.max(-paddleHalfDepth, Math.min(paddleHalfDepth, dz));
                const normalized = clampedOffset / paddleHalfDepth;
                const angle = normalized * Math.PI / 4;
    
                const direction = new BABYLON.Vector3(
                    Math.cos(angle),
                    0,
                    Math.sin(angle)
                ).normalize();
    
                this.ballVelocity = direction.scale(speed);
    
                this.ballVelocity.x = isPaddle2
                    ? Math.abs(this.ballVelocity.x)
                    : -Math.abs(this.ballVelocity.x);
    
                const sign = dx > 0 ? 1 : -1;
                const penetration = (paddleHalfWidth + this.ballRadius) - Math.abs(dx);
                this.ballBody.position.x += sign * (penetration + 0.01);
            }
            this.rebounds++;
        }
    }
    handleBallScoreZone(ball, paddle1, paddle2) {
        if (Math.abs(ball.x) > 20) {
            const wasGoingLeft = this.ballVelocity.x < 0;
    
            if (this.ballBody.position.x < 0) {
                paddle1.playerScore++;
                this.ballBody.position.x = -0.2;
            } else {
                paddle2.playerScore++;
                this.ballBody.position.x = 0.2;
            }
    
            const speed = this.ballVelocity.length();
            const direction = wasGoingLeft ? -1 : 1;
            const angle = 0;
            const newVelocity = new BABYLON.Vector3(direction * Math.cos(angle), 0, Math.sin(angle)).scale(speed);
    
            this.handleBallRespawn(newVelocity);
        }
    }
    handleBallRespawn(previousVelocity) {
        this.ballVelocity = BABYLON.Vector3.Zero();
        this.ballBody.position.z = 0;
        this.ballBody.position.y = -2;
        const totalFrames = 60;
        let frame = 0;
        const riseInterval = setInterval(() => {
            frame++;
            const t = frame / totalFrames;
            this.ballBody.position.y = -2 + 3 * t;
    
            if (frame >= totalFrames) {
                clearInterval(riseInterval);
                this.ballVelocity = previousVelocity;
            }
        }, 2000 / totalFrames);
    }
    ballMovement(paddle1, paddle2, scene) {
        this.handleBallAcceleration();
        this.handleBallWallCollisions();

        const ball = this.ballBody.position;
        const speed = this.ballVelocity.length();
        const halfDepth = 2.5;
        const paddleFrontMargin = 0.5;

        this.handleBallReboundPaddles(ball, speed, paddle1, paddle2, halfDepth, paddleFrontMargin, scene);
        this.ballBody.position.addInPlace(this.ballVelocity);
        this.handleBallScoreZone(ball, paddle1, paddle2);
        //console.log(`P1 SCORE = ${paddle1.getPlayerScore} P1 rebounds = ${paddle1.getPlayerRebounds} P2 SCORE = ${paddle2.getPlayerScore} P2 rebounds = ${paddle2.getPlayerRebounds}`);
    }
    get getBallBody () {
        return this.ballBody;
    }
}

export {ball};