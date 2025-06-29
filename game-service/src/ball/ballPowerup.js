export class BallPowerup {
    constructor() {
        this.isSpeedBoosted = false;
        this.speedMultiplier = 4.0; // ⚡ TESTING: 4x speed for obvious difference
        this.originalSpeed = 0;
        this.boostDuration = 0; // No duration limit, lasts until next paddle hit
        this.activatedByPlayer = null;
    }

    // Apply powerup speed boost to the ball
    applySpeedBoost(ball, activatedByPlayerId) {
        if (this.isSpeedBoosted) {
            console.log('Speed boost already active, ignoring new activation');
            return false;
        }

        this.originalSpeed = ball.speed;
        this.isSpeedBoosted = true;
        this.activatedByPlayer = activatedByPlayerId;
        
        // Apply 2x speed multiplier
        const boostedSpeed = this.originalSpeed * this.speedMultiplier;
        
        // Update ball velocity with boosted speed
        const currentVelocityLength = ball.velocity.length();
        console.log(`🔧 BEFORE velocity scaling: velocity.length = ${currentVelocityLength}, ball.speed = ${ball.speed}`);
        
        if (currentVelocityLength > 0) {
            const scaleFactor = boostedSpeed / currentVelocityLength;
            console.log(`🔧 Scale factor: ${scaleFactor} (${boostedSpeed} / ${currentVelocityLength})`);
            
            ball.velocity = ball.velocity.scale(scaleFactor);
            console.log(`🔧 AFTER velocity scaling: velocity.length = ${ball.velocity.length()}`);
        }
        ball.speed = boostedSpeed;
        console.log(`🔧 Final ball.speed property: ${ball.speed}`);
        
        console.log(`🚀 SPEED BOOST APPLIED: ${this.originalSpeed} → ${boostedSpeed} (${this.speedMultiplier}x) by player ${activatedByPlayerId}`);
        console.log(`🚀 Ball velocity length after boost: ${ball.velocity.length()}`);
        console.log(`🚀 Ball.speed property after boost: ${ball.speed}`);
        
        return true;
    }

    // Remove speed boost (called after next paddle hit)
    removeSpeedBoost(ball) {
        if (!this.isSpeedBoosted) {
            return false;
        }

        console.log(`Removing speed boost, returning to normal speed handling`);
        
        this.isSpeedBoosted = false;
        this.activatedByPlayer = null;
        this.originalSpeed = 0;
        
        // Let the ball's normal speed handling take over
        // The ball will recalculate its speed based on current rebounds in handleAcceleration()
        
        return true;
    }

    // Check if ball currently has speed boost active
    hasSpeedBoost() {
        return this.isSpeedBoosted;
    }

    // Get current powerup state
    getState() {
        return {
            isSpeedBoosted: this.isSpeedBoosted,
            speedMultiplier: this.speedMultiplier,
            activatedByPlayer: this.activatedByPlayer,
            originalSpeed: this.originalSpeed
        };
    }

    // Reset powerup state
    reset() {
        this.isSpeedBoosted = false;
        this.activatedByPlayer = null;
        this.originalSpeed = 0;
    }

    // Update method (called each frame)
    update(deltaTime) {
        // Currently no frame-based updates needed
        // Speed boost removal is handled by paddle collision events
    }
}
