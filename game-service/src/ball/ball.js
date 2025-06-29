import * as BABYLON from '@babylonjs/core';
import { createExplosion } from './ballEffects.js';
import { GAME_CONFIG } from '../core/constants.js';
import { BALL_CONSTANTS } from './ballConstants.js';
import { BallPowerup } from './ballPowerup.js';
import { playerManager } from '../player/PlayerManager.js';

class Ball {
    constructor(player1, player2, gameEngine = null, roomId = null) {
        this.position = new BABYLON.Vector3(
            BALL_CONSTANTS.INITIAL_POSITION.x,
            BALL_CONSTANTS.INITIAL_POSITION.y,
            BALL_CONSTANTS.INITIAL_POSITION.z
        );
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.previousVelocity = new BABYLON.Vector3(0, 0, 0);
        this.radius = BALL_CONSTANTS.RADIUS;
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
        
        // Initialize powerup system
        this.powerup = new BallPowerup();
    }

    init() {
        this.position = new BABYLON.Vector3(
            BALL_CONSTANTS.INITIAL_POSITION.x,
            BALL_CONSTANTS.INITIAL_POSITION.y,
            BALL_CONSTANTS.INITIAL_POSITION.z
        );
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.previousVelocity = new BABYLON.Vector3(0, 0, 0);
        this.rebounds = 0;
        this.isRespawning = false;
        this.respawnTime = 0;
        this.hasValidPosition = true;
        this.speed = BALL_CONSTANTS.INITIAL_SPEED;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
        // Reset glow properties
        this.currentGlowColor = new BABYLON.Color3(0, 0, 0);
        this.shouldGlow = false;
        this.lastSpeedTier = 0;
    }

    setFirstVelocity() {
        this.velocity = new BABYLON.Vector3(Math.random() >= 0.5 ? BALL_CONSTANTS.INITIAL_SPEED : -BALL_CONSTANTS.INITIAL_SPEED, 0, 0);
        this.previousVelocity.copyFrom(this.velocity);
        this.speed = BALL_CONSTANTS.INITIAL_SPEED;
    }

    handleBallRespawn(previousVelocity) {
        this.position = new BABYLON.Vector3(
            BALL_CONSTANTS.INITIAL_POSITION.x,
            BALL_CONSTANTS.INITIAL_POSITION.y,
            BALL_CONSTANTS.INITIAL_POSITION.z
        );
        this.velocity = BABYLON.Vector3.Zero();
        this.previousVelocity.copyFrom(previousVelocity);
        this.isRespawning = true;
        this.respawnTime = 0;
        this.hasValidPosition = true;
        this.speed = BALL_CONSTANTS.INITIAL_SPEED;
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

        // ⭐ CRITICAL FIX: Only call handleAcceleration if no powerup boost is active
        if (!this.powerup.hasSpeedBoost()) {
            this.handleAcceleration();
        } else {
            console.log(`🔧 MAIN UPDATE: Skipping handleAcceleration() due to active powerup boost`);
        }
        
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
        if (this.rebounds < BALL_CONSTANTS.SPEED_TIERS.TIER_1_THRESHOLD) {
            speed = GAME_CONFIG.INITIAL_BALL_SPEED; // Base speed
            glowColor = new BABYLON.Color3(0, 0, 0); // No glow
        } else {
            // Scale speed between first boost and max based on rebounds beyond threshold
            const extraRebounds = this.rebounds - BALL_CONSTANTS.SPEED_TIERS.TIER_1_THRESHOLD;
            const scalingFactor = Math.min(extraRebounds / 10, 1); // Scale over 10 rebounds
            const minSpeed = GAME_CONFIG.FIRST_SPEED_BOOST;
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
        this.shouldGlow = this.rebounds >= BALL_CONSTANTS.SPEED_TIERS.TIER_1_THRESHOLD;
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
            
            const hitPlayerId = isHittingPlayer2 ? this.player2.playerId : this.player1.playerId;
            this.wasHitByPlayer = hitPlayerId;
            
            // ⭐ POWERUP INTEGRATION: Check for powerup activation
            // Get player from playerManager to ensure we have the powerup system
            const hitPlayer = isHittingPlayer2 ? this.player2 : this.player1;
            let actualPlayer = null;
            
            // Try to get the actual player with powerup system from playerManager
            actualPlayer = playerManager.getPlayer(hitPlayerId);
            
            let powerupActivated = false;
            
            console.log(`🔧 ===== PADDLE HIT DEBUG =====`);
            console.log(`🔧 Ball hit paddle for player: ${hitPlayerId}`);
            console.log(`🔧 hitPlayer.powerup exists: ${!!hitPlayer.powerup}`);
            console.log(`🔧 actualPlayer exists: ${!!actualPlayer}`);
            console.log(`🔧 actualPlayer.powerup exists: ${!!(actualPlayer && actualPlayer.powerup)}`);
            
            if (actualPlayer && actualPlayer.powerup) {
                console.log(`🔧 actualPlayer.powerup.isActive: ${actualPlayer.powerup.isActive}`);
                console.log(`🔧 actualPlayer.powerup.isWithinWindow(): ${actualPlayer.powerup.isWithinWindow()}`);
            }
            
            console.log(`🔧 Ball rebounds: ${this.rebounds}`);
            console.log(`🔧 ==============================`);
            
            // Use actualPlayer if available, fallback to hitPlayer
            const playerToCheck = actualPlayer || hitPlayer;
            
            if (playerToCheck.powerup && playerToCheck.powerup.isWithinWindow()) {
                console.log(`🚀 ATTEMPTING PowerUp activation for player ${hitPlayerId}!`);
                
                // Powerup successfully activated!
                powerupActivated = this.powerup.applySpeedBoost(this, hitPlayerId);
                if (powerupActivated) {
                    playerToCheck.powerup.onSuccess();
                    
                    console.log(`🎉 PowerUp SUCCESSFULLY APPLIED! Ball speed boosted by ${this.powerup.speedMultiplier}x`);
                    console.log(`🚀 IMMEDIATE CHECK: Ball velocity length = ${this.velocity.length()}, Ball.speed = ${this.speed}`);
                    
                    // Broadcast powerup activation to clients
                    if (this.gameEngine && this.roomId) {
                        this.gameEngine.broadcastToRoom(this.roomId, {
                            type: 'powerupActivated',
                            playerId: hitPlayerId,
                            ballSpeedMultiplier: this.powerup.speedMultiplier,
                            timestamp: Date.now()
                        });
                        console.log(`📡 Broadcasted powerup activation to clients`);
                    }
                } else {
                    console.log(`❌ PowerUp activation FAILED in applySpeedBoost`);
                }
            } else if (this.powerup.hasSpeedBoost()) {
                console.log(`🔄 Removing existing speed boost on paddle hit`);
                
                // Remove powerup boost after next paddle hit
                this.powerup.removeSpeedBoost(this);
                
                // Broadcast powerup deactivation
                if (this.gameEngine && this.roomId) {
                    this.gameEngine.broadcastToRoom(this.roomId, {
                        type: 'powerupDeactivated',
                        timestamp: Date.now()
                    });
                    console.log(`📡 Broadcasted powerup deactivation to clients`);
                }
            } else {
                console.log(`🔧 No powerup activation - Player has powerup: ${!!playerToCheck.powerup}, Is within window: ${playerToCheck.powerup ? playerToCheck.powerup.isWithinWindow() : 'N/A'}`);
                console.log(`🔧 Available players - hitPlayer: ${!!hitPlayer.powerup}, actualPlayer: ${!!(actualPlayer && actualPlayer.powerup)}`);
            }
            
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
            
            // Update speed and glow based on new rebounds count (only if no powerup boost active)
            console.log(`🔧 BEFORE speed handling: Ball velocity length = ${this.velocity.length()}, Ball.speed = ${this.speed}`);
            
            const hasPowerupBoost = this.powerup.hasSpeedBoost();
            console.log(`🔧 Speed handling: hasPowerupBoost=${hasPowerupBoost}, ballSpeed=${this.speed}, powerupState:`, this.powerup.getState());
            
            if (!hasPowerupBoost) {
                console.log(`🔧 No powerup boost detected, calling handleAcceleration()`);
                this.handleAcceleration();
                console.log(`🔧 After handleAcceleration: ballSpeed=${this.speed}, velocity length=${this.velocity.length()}`);
            } else {
                console.log(`🔧 Powerup boost active, SKIPPING handleAcceleration to preserve boosted speed`);
            }
            
            console.log(`🔧 AFTER speed handling: Ball velocity length = ${this.velocity.length()}, Ball.speed = ${this.speed}`);
            
            // Mark speed tier change for client notification
            if (newSpeedTier !== previousSpeedTier) {
                this.speedTierChanged = true;
                this.lastSpeedTier = newSpeedTier;
            }

            // Broadcast paddle hit sound event
            if (this.gameEngine && this.roomId) {
                this.gameEngine.broadcastToRoom(this.roomId, {
                    type: 'soundEvent',
                    sound: powerupActivated ? 'powerUpHit' : 'paddleHit',
                    timestamp: Date.now(),
                    ballSpeed: this.speed,
                    rebounds: this.rebounds,
                    hitByPlayer: this.wasHitByPlayer,
                    powerupActivated: powerupActivated
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
                newVelocity = new BABYLON.Vector3(-BALL_CONSTANTS.INITIAL_SPEED, 0, 0);
            } else {
                // Ball went past right side (Player 1's side), Player 2 scores  
                this.player2.playerScore++;
                losingPlayerId = this.player1.playerId; // Player 1 lost the point
                winningPlayerId = this.player2.playerId;
                // Ball goes towards the loser (Player 1 - right side)
                newVelocity = new BABYLON.Vector3(BALL_CONSTANTS.INITIAL_SPEED, 0, 0);
            }

            // Send lost point sound only to the player who lost

            if (this.gameEngine && this.roomId) {
                if (losingPlayerId) {
                    this.gameEngine.sendToPlayer(this.roomId, losingPlayerId, {
                        type: 'soundEvent',
                        sound: 'lostPoint',
                        timestamp: Date.now()
                    });
                } if (winningPlayerId) {
                    this.gameEngine.sendToPlayer(this.roomId, winningPlayerId, {
                        type: 'soundEvent',
                        sound: 'playerScored',
                        timestamp: Date.now()
                    });
                }
            }
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
        if (rebounds < BALL_CONSTANTS.SPEED_TIERS.TIER_1_THRESHOLD) return 0;
        else return 1;
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
            this.position = new BABYLON.Vector3(
                BALL_CONSTANTS.INITIAL_POSITION.x,
                BALL_CONSTANTS.INITIAL_POSITION.y,
                BALL_CONSTANTS.INITIAL_POSITION.z
            );
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
        this.speed = state.speed || BALL_CONSTANTS.INITIAL_SPEED;
        this.lastPosition = this.position.clone();
        this.lastUpdateTime = Date.now();
    }
}

export { Ball };