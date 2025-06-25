import * as BABYLON from '@babylonjs/core';
import { createExplosion } from './ballEffects.js';
import { GAME_CONFIG } from '../core/constants.js';

class Ball {
    constructor(player1, player2, gameEngine = null, roomId = null) {
        this.position = new BABYLON.Vector3(0, -2, 0);
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.previousVelocity = new BABYLON.Vector3(0, 0, 0);
        this.radius = 0.75;
        this.rebounds = 0;
        this.wasHitByPlayer = undefined;
        this.isRespawning = false;
        this.respawnTime = 0;
        this.respawnDuration = 2;
        this.player1 = player1;
        this.player2 = player2;
        this.gameEngine = gameEngine;
        this.roomId = roomId;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
        this.hasValidPosition = true;
        this.speed = GAME_CONFIG.INITIAL_BALL_SPEED;
        this.currentGlowColor = new BABYLON.Color3(0, 0, 0);
        this.shouldGlow = false;
        this.lastSpeedTier = 0; // Track speed tier changes
    }

    init() {
        this.position = new BABYLON.Vector3(0, -2, 0);
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.previousVelocity = new BABYLON.Vector3(0, 0, 0);
        this.rebounds = 0;
        this.isRespawning = false;
        this.respawnTime = 0;
        this.hasValidPosition = true;
        this.speed = GAME_CONFIG.INITIAL_BALL_SPEED;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
        // Reset glow properties
        this.currentGlowColor = new BABYLON.Color3(0, 0, 0);
        this.shouldGlow = false;
        this.lastSpeedTier = 0;
    }

    setFirstVelocity() {
        this.velocity = new BABYLON.Vector3(Math.random() >= 0.5 ? GAME_CONFIG.INITIAL_BALL_SPEED : -GAME_CONFIG.INITIAL_BALL_SPEED, 0, 0);
        this.previousVelocity.copyFrom(this.velocity);
        this.speed = GAME_CONFIG.INITIAL_BALL_SPEED;
    }

    handleBallRespawn(previousVelocity) {
        this.position = new BABYLON.Vector3(0, -2, 0);
        this.velocity = BABYLON.Vector3.Zero();
        this.previousVelocity.copyFrom(previousVelocity);
        this.isRespawning = true;
        this.respawnTime = 0;
        this.hasValidPosition = true;
        this.speed = GAME_CONFIG.INITIAL_BALL_SPEED;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
    }

    update(deltaTime, paddle1Pos, paddle2Pos) {
        if (this.isRespawning) {
            this.respawnTime += deltaTime;
            const t = Math.min(this.respawnTime / this.respawnDuration, 1);
            this.position.y = -2 + 3 * t;
            this.position.z = 0;
            this.position.x = 0;
            if (t >= 1) {
                this.isRespawning = false;
                this.position.y = 1;
                this.velocity.copyFrom(this.previousVelocity);
                if (this.velocity.length() === 0) {
                    this.setFirstVelocity();
                }
                this.hasValidPosition = true;
                this.handleAcceleration();
                console.log('Respawn complete:', { position: this.position, velocity: this.velocity, speed: this.speed, rebounds: this.rebounds });
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
        let wallHit = false;
        
        if (this.position.z >= mapHalfDepth - this.radius) {
            this.velocity.z *= -1;
            this.position.z = mapHalfDepth - this.radius;
            wallHit = true;
        } else if (this.position.z <= -mapHalfDepth + this.radius) {
            this.velocity.z *= -1;
            this.position.z = -mapHalfDepth + this.radius;
            wallHit = true;
        }

        // Broadcast wall hit sound event
        if (wallHit && this.gameEngine && this.roomId) {
            this.gameEngine.broadcastToRoom(this.roomId, {
                type: 'soundEvent',
                sound: 'wallHit',
                timestamp: Date.now(),
                ballSpeed: this.speed
            });
        }
    }

    handleAcceleration() {
        let speed;
        let glowColor = null;
        
        // New speed tiers based on rebounds with glowing effects
        if (this.rebounds < GAME_CONFIG.SPEED_BOOST_THRESHOLD_1) {
            speed = GAME_CONFIG.INITIAL_BALL_SPEED; // Base speed
            glowColor = new BABYLON.Color3(0, 0, 0); // No glow
        } else if (this.rebounds >= GAME_CONFIG.SPEED_BOOST_THRESHOLD_1 && this.rebounds < GAME_CONFIG.SPEED_BOOST_THRESHOLD_2) {
            speed = GAME_CONFIG.FIRST_SPEED_BOOST; // First speed boost
            glowColor = new BABYLON.Color3(0.8, 0.4, 0); // Orange glow
        } else if (this.rebounds >= GAME_CONFIG.SPEED_BOOST_THRESHOLD_2) {
            // Scale speed between 40-45 based on rebounds beyond threshold
            const extraRebounds = this.rebounds - GAME_CONFIG.SPEED_BOOST_THRESHOLD_2;
            const scalingFactor = Math.min(extraRebounds / 10, 1); // Scale over 10 rebounds
            const minSpeed = 40;
            const speedRange = GAME_CONFIG.MAX_BALL_SPEED - minSpeed;
            speed = minSpeed + (speedRange * scalingFactor);
            
            // Transition from orange to red-white
            const redIntensity = 1;
            const greenIntensity = 0.2 + (0.6 * scalingFactor); // From orange to white-red
            const blueIntensity = scalingFactor * 0.4; // Slight blue tint at max speed
            glowColor = new BABYLON.Color3(redIntensity, greenIntensity, blueIntensity);
        }

        const currentSpeed = this.velocity.length();
        if (currentSpeed > 0) {
            this.velocity = this.velocity.scale(speed / currentSpeed);
        } else {
            this.velocity = new BABYLON.Vector3(this.velocity.x >= 0 ? speed : -speed, 0, this.velocity.z);
        }
        this.previousVelocity.copyFrom(this.velocity);
        this.speed = speed;
        
        // Store glow information for client synchronization
        this.currentGlowColor = glowColor;
        this.shouldGlow = this.rebounds >= GAME_CONFIG.SPEED_BOOST_THRESHOLD_1;
    }

    handlePaddleCollisions(paddle1Pos, paddle2Pos) {
        const isHittingPlayer2 = this.velocity.x < 0; // Ball going left hits player2 (left side)
        const paddle = isHittingPlayer2 ? paddle2Pos : paddle1Pos;
        const dx = this.position.x - paddle.x;
        const dz = this.position.z - paddle.z;
        const paddleHalfWidth = 0.5;
        const paddleHalfDepth = 2.5;

        const overlapX = Math.abs(dx) <= paddleHalfWidth + this.radius;
        const overlapZ = Math.abs(dz) <= paddleHalfDepth + this.radius;

        if (overlapX && overlapZ) {
            const previousSpeedTier = this.getSpeedTier(this.rebounds);
            this.rebounds++;
            const newSpeedTier = this.getSpeedTier(this.rebounds);
            
            this.wasHitByPlayer = isHittingPlayer2 ? this.player2.playerId : this.player1.playerId;
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
                this.velocity.x = isHittingPlayer2 ? Math.abs(this.velocity.x) : -Math.abs(this.velocity.x);
                const sign = dx > 0 ? 1 : -1;
                this.position.x += sign * ((paddleHalfWidth + this.radius) - Math.abs(dx) + 0.01);
            }
            this.previousVelocity.copyFrom(this.velocity);
            
            // Update speed and glow based on new rebounds count
            this.handleAcceleration();
            
            // Mark speed tier change for client notification
            if (newSpeedTier !== previousSpeedTier) {
                this.speedTierChanged = true;
                this.lastSpeedTier = newSpeedTier;
            }

            // Broadcast paddle hit sound event
            if (this.gameEngine && this.roomId) {
                this.gameEngine.broadcastToRoom(this.roomId, {
                    type: 'soundEvent',
                    sound: 'paddleHit',
                    timestamp: Date.now(),
                    ballSpeed: this.speed,
                    rebounds: this.rebounds,
                    hitByPlayer: this.wasHitByPlayer
                });
            }
        }
    }

    handleScoreZone() {
        if (Math.abs(this.position.x) > 20) {
            let newVelocity;
            let losingPlayerId;
            let winningPlayerId;
            
            if (this.position.x < 0) {
                // Ball went past left side (Player 2's side), Player 1 scores
                this.player1.playerScore++;
                losingPlayerId = this.player2.playerId; // Player 2 lost the point
                winningPlayerId = this.player1.playerId;
                // Ball goes towards the loser (Player 2 - left side)
                newVelocity = new BABYLON.Vector3(-GAME_CONFIG.INITIAL_BALL_SPEED, 0, 0);
            } else {
                // Ball went past right side (Player 1's side), Player 2 scores  
                this.player2.playerScore++;
                losingPlayerId = this.player1.playerId; // Player 1 lost the point
                winningPlayerId = this.player2.playerId;
                // Ball goes towards the loser (Player 1 - right side)
                newVelocity = new BABYLON.Vector3(GAME_CONFIG.INITIAL_BALL_SPEED, 0, 0);
            }

            // Send lost point sound only to the player who lost

            if (this.gameEngine && this.roomId) {
                if (losingPlayerId) {
                    this.gameEngine.sendToPlayer(this.roomId, losingPlayerId, {
                        type: 'soundEvent',
                        sound: 'lostPoint',
                        timestamp: Date.now()
                    });
                } if(winningPlayerId) {
                    this.gameEngine.sendToPlayer(this.roomId, winningPlayerId, {
                        type: 'soundEvent',
                        sound: 'playerScored',
                        timestamp: Date.now()
                    });
                }
            }
            
            //if (this.gameEngine && this.roomId && losingPlayerId) {
            //    this.gameEngine.sendToPlayer(this.roomId, losingPlayerId, {
            //        type: 'soundEvent',
            //        sound: 'lostPoint',
            //        timestamp: Date.now()
            //    });
            //}
            
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

    getSpeedTier(rebounds) {
        if (rebounds < GAME_CONFIG.SPEED_BOOST_THRESHOLD_1) return 0;
        else if (rebounds < GAME_CONFIG.SPEED_BOOST_THRESHOLD_2) return 1;
        else return 2;
    }

    updateClient(scene) {
        if (this.ballBody && this.hasValidPosition) {
            this.ballBody.position.copyFrom(this.position);
            if (this.isRespawning || this.position.y > -2) {
                this.ballBody.isVisible = true;
            }
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
            return;
        }

        if (this.isRespawning && state.isRespawning) {
            return;
        }

        this.position.copyFrom(state.position);
        this.velocity.copyFrom(state.velocity);
        this.previousVelocity.copyFrom(state.previousVelocity || this.velocity);
        this.rebounds = state.rebounds || 0;
        this.isRespawning = state.isRespawning || false;
        this.respawnTime = state.respawnTime || 0;
        this.wasHitByPlayer = state.wasHitByPlayer;
        this.hasValidPosition = state.hasValidPosition;
        this.speed = state.speed || GAME_CONFIG.INITIAL_BALL_SPEED;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
    }
}

export { Ball };