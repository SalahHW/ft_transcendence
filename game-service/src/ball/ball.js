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
        
        // Simplified speed tiers based on rebounds with glowing effects
        if (this.rebounds < BALL_CONSTANTS.SPEED_TIERS.TIER_1_THRESHOLD) {
            speed = GAME_CONFIG.INITIAL_BALL_SPEED; // Base speed (17)
            glowColor = new BABYLON.Color3(0, 0, 0); // No glow
        } else {
            // Cap at first speed boost - no more scaling beyond this point
            speed = GAME_CONFIG.FIRST_SPEED_BOOST; // Capped speed (27)
            
            // Fixed glow color for boosted speed (orange)
            glowColor = new BABYLON.Color3(1, 0.6, 0.2); // Orange glow
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
            const hitPlayerId = isHittingPlayer2 ? this.player2.playerId : this.player1.playerId;
            const hitPlayer = isHittingPlayer2 ? this.player2 : this.player1;
            const actualPlayer = playerManager.getPlayer(hitPlayerId);
            const playerToCheck = actualPlayer || hitPlayer;
            
            // ⭐ NEW: Check if ball has speed boost (should traverse through paddle)
            const ballHasSpeedBoost = this.powerup.hasSpeedBoost();
            const playerHasDefensivePowerup = playerToCheck.powerup && playerToCheck.powerup.isWithinWindow();
            
            // Initialize speed tier variables for use throughout the method
            const previousSpeedTier = this.getSpeedTier(this.rebounds);
            let newSpeedTier = previousSpeedTier;
            

            
            // ⭐ DEFENSIVE COUNTER: If ball has speed boost but player counters with powerup
            if (ballHasSpeedBoost && playerHasDefensivePowerup) {

                
                // Apply defensive counter logic (normal collision + speed stack)
                this.rebounds++;
                newSpeedTier = this.getSpeedTier(this.rebounds);
                this.wasHitByPlayer = hitPlayerId;
                
                // Stack speed boost (defensive counter adds another multiplier)
                const currentSpeed = this.speed;
                const stackedSpeed = currentSpeed * 2.0; // Stack another 2x on top
                
                // Update ball speed with stacked boost
                const currentVelocityLength = this.velocity.length();
                if (currentVelocityLength > 0) {
                    this.velocity = this.velocity.scale(stackedSpeed / currentVelocityLength);
                }
                this.speed = stackedSpeed;
                
                // Update powerup state with new stacked speed
                this.powerup.originalSpeed = currentSpeed; // Update reference
                

                
                // Trigger defensive powerup success
                playerToCheck.powerup.onSuccess();
                
                // Broadcast defensive powerup activation to clients
                if (this.gameEngine && this.roomId) {
                    this.gameEngine.broadcastToRoom(this.roomId, {
                        type: 'powerupActivated',
                        playerId: hitPlayerId,
                        ballSpeedMultiplier: 2.0, // The stacking multiplier
                        powerupType: 'defensive',
                        originalSpeed: currentSpeed,
                        stackedSpeed: stackedSpeed,
                        timestamp: Date.now()
                    });

                }
                
                // ⭐ DEFENSIVE COUNTER SOUND: Play defensive sound immediately for defensive counters
                if (this.gameEngine && this.roomId) {
                    this.gameEngine.broadcastToRoom(this.roomId, {
                        type: 'soundEvent',
                        sound: 'defensivePowerUp',
                        timestamp: Date.now(),
                        ballSpeed: stackedSpeed,
                        rebounds: this.rebounds,
                        hitByPlayer: hitPlayerId,
                        powerupActivated: true,
                        powerupType: 'defensive'
                    });

                }
                
                // Continue with normal collision physics but with stacked speed
                
            } else if (ballHasSpeedBoost && !playerHasDefensivePowerup) {

                
                // ⭐ TRAVERSAL LOGIC: Ball keeps its speed boost and continues through paddle
                // The speed boost will be removed when the point is scored, not here
                // Don't increment rebounds, don't change direction - ball passes through
                
                // Broadcast traversal event (but keep powerup active)
                if (this.gameEngine && this.roomId) {
                    this.gameEngine.broadcastToRoom(this.roomId, {
                        type: 'ballTraversal',
                        playerId: hitPlayerId,
                        ballSpeed: this.speed,
                        timestamp: Date.now()
                    });

                }
                
                // Ball traverses through - no collision, continue to score zone
                // Don't increment rebounds, don't change direction, KEEP speed boost
                return; // Skip normal collision handling
                
            } else {

                
                // Normal collision logic
                this.rebounds++;
                newSpeedTier = this.getSpeedTier(this.rebounds);
                this.wasHitByPlayer = hitPlayerId;
            }
            
            // ⭐ POWERUP INTEGRATION: Check for powerup activation (reuse variables from above)
            let powerupActivated = false;
            

            
            // Check for OFFENSIVE powerup (normal speed boost when ball isn't already boosted)
            if (!ballHasSpeedBoost && playerToCheck.powerup && playerToCheck.powerup.isWithinWindow()) {

                
                // Apply offensive powerup (normal speed boost)
                powerupActivated = this.powerup.applySpeedBoost(this, hitPlayerId);
                if (powerupActivated) {
                    playerToCheck.powerup.onSuccess();
                    

                    
                    // Broadcast offensive powerup activation to clients
                    if (this.gameEngine && this.roomId) {
                        this.gameEngine.broadcastToRoom(this.roomId, {
                            type: 'powerupActivated',
                            playerId: hitPlayerId,
                            ballSpeedMultiplier: this.powerup.speedMultiplier,
                            powerupType: 'offensive',
                            timestamp: Date.now()
                        });

                    }
                } else {

                }
            } else {

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
            const hasPowerupBoost = this.powerup.hasSpeedBoost();
            
            if (!hasPowerupBoost) {
                this.handleAcceleration();
            }
            
            // Mark speed tier change for client notification
            if (newSpeedTier !== previousSpeedTier) {
                this.speedTierChanged = true;
                this.lastSpeedTier = newSpeedTier;
            }

            // Broadcast paddle hit sound event with different sounds for powerup types
            if (this.gameEngine && this.roomId) {
                // Check if this was a defensive counter (ball had speed boost + player had defensive powerup)
                const wasDefensiveCounter = ballHasSpeedBoost && playerHasDefensivePowerup;
                
                if (wasDefensiveCounter) {
                    // ⭐ SKIP: Defensive counter sound already sent above
                } else {
                    // Send sound for non-defensive cases (offensive powerup or normal hit)
                    let soundToPlay = 'paddleHit'; // Default sound (pop.mp3)
                    let powerupType = 'none';
                    
                    if (powerupActivated) {
                        // Offensive powerup sound  
                        soundToPlay = 'powerUpHit';
                        powerupType = 'offensive';
                    }
                    // else: keep default 'paddleHit' for normal hits
                    
                    this.gameEngine.broadcastToRoom(this.roomId, {
                        type: 'soundEvent',
                        sound: soundToPlay,
                        timestamp: Date.now(),
                        ballSpeed: this.speed,
                        rebounds: this.rebounds,
                        hitByPlayer: this.wasHitByPlayer,
                        powerupActivated: powerupActivated,
                        powerupType: powerupType
                    });
                    

                }
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

            // ⭐ RESET POWERUP STATE: Remove any speed boost when point is scored
            const hadPowerup = this.powerup.hasSpeedBoost();
            if (hadPowerup) {
                this.powerup.removeSpeedBoost(this);
                
                // Broadcast powerup deactivation
                if (this.gameEngine && this.roomId) {
                    this.gameEngine.broadcastToRoom(this.roomId, {
                        type: 'powerupDeactivated',
                        reason: 'pointScored',
                        timestamp: Date.now()
                    });
                }
            }

            // ⭐ RESET PLAYER STATES: Both players become SOLID again for next rally
            if (this.gameEngine && this.roomId) {
                this.gameEngine.broadcastToRoom(this.roomId, {
                    type: 'resetPlayerStates',
                    reason: 'pointScored',
                    timestamp: Date.now()
                });

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