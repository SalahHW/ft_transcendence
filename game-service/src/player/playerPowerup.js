import { BALL_CONSTANTS } from '../ball/ballConstants.js';

export class PlayerPowerup {
    constructor(playerId) {
        this.playerId = playerId;
        this.isAvailable = true;
        this.isActive = false;
        this.activationTime = 0;
        this.cooldownEndTime = 0;
        this.windowDuration = 1000; // ⭐ TESTING: Extended to 1000ms (1 second) for easier testing
        this.successCooldown = 5000; // 5 seconds on success
        this.failureCooldown = 15000; // 15 seconds on failure
    }

    // Check if powerup can be activated (max speed tier + not on cooldown)
    canActivate(ballRebounds) {
        const currentTime = Date.now();
        const isMaxSpeedTier = ballRebounds >= BALL_CONSTANTS.SPEED_TIERS.TIER_1_THRESHOLD;
        const notOnCooldown = currentTime >= this.cooldownEndTime;
        
        // ⭐ FORCED CLEANUP: If active but window expired, force cleanup
        if (this.isActive) {
            const windowExpired = (currentTime - this.activationTime) > this.windowDuration;
            if (windowExpired) {
                console.log(`🔧 FORCED CLEANUP: PowerUp window expired for player ${this.playerId}, forcing cleanup`);
                this.onFailure();
            }
        }
        
        console.log(`🔧 PowerUp canActivate check for player ${this.playerId}:`, {
            ballRebounds,
            threshold: BALL_CONSTANTS.SPEED_TIERS.TIER_1_THRESHOLD,
            isMaxSpeedTier,
            notOnCooldown,
            isAvailable: this.isAvailable,
            isActive: this.isActive,
            cooldownEndTime: this.cooldownEndTime,
            currentTime,
            windowExpired: this.isActive ? (currentTime - this.activationTime) > this.windowDuration : false
        });
        
        return isMaxSpeedTier && notOnCooldown && this.isAvailable && !this.isActive;
    }

    // Activate the powerup (player pressed 'a')
    activate(ballRebounds) {
        console.log(`🔧 PowerUp activation attempt for player ${this.playerId} with ballRebounds: ${ballRebounds}`);
        
        if (!this.canActivate(ballRebounds)) {
            console.log(`❌ PowerUp activation FAILED for player ${this.playerId}`);
            return false;
        }

        this.isActive = true;
        this.isAvailable = false;
        this.activationTime = Date.now();
        
        console.log(`✅ PowerUp ACTIVATED for player ${this.playerId} at ${this.activationTime} - Window: ${this.windowDuration}ms`);
        return true;
    }

    // Check if ball hit is within the activation window
    isWithinWindow(hitTime = Date.now()) {
        if (!this.isActive) {
            console.log(`🔧 PowerUp isWithinWindow check: NOT ACTIVE for player ${this.playerId} (isActive: ${this.isActive})`);
            return false;
        }
        
        const timeSinceActivation = hitTime - this.activationTime;
        const withinWindow = timeSinceActivation >= 0 && timeSinceActivation <= this.windowDuration;
        
        console.log(`🔧 PowerUp isWithinWindow check for player ${this.playerId}:`, {
            isActive: this.isActive,
            timeSinceActivation,
            windowDuration: this.windowDuration,
            withinWindow,
            hitTime,
            activationTime: this.activationTime,
            windowExpired: timeSinceActivation > this.windowDuration
        });
        
        // Auto-cleanup if window expired
        if (timeSinceActivation > this.windowDuration) {
            console.log(`🔧 AUTO-CLEANUP: PowerUp window expired during isWithinWindow check for player ${this.playerId}`);
            this.onFailure();
            return false;
        }
        
        return withinWindow;
    }

    // Handle successful powerup use (ball hit within window)
    onSuccess() {
        if (!this.isActive) return false;
        
        this.isActive = false;
        this.cooldownEndTime = Date.now() + this.successCooldown;
        
        console.log(`🎉 PowerUp SUCCESS for player ${this.playerId}, cooldown until ${this.cooldownEndTime}`);
        
        // Schedule availability return
        setTimeout(() => {
            this.isAvailable = true;
            console.log(`🔄 PowerUp available again for player ${this.playerId}`);
        }, this.successCooldown);
        
        return true;
    }

    // Handle failed powerup use (window expired without ball hit)
    onFailure() {
        if (!this.isActive) return false;
        
        this.isActive = false;
        this.cooldownEndTime = Date.now() + this.failureCooldown;
        
        console.log(`💥 PowerUp FAILED for player ${this.playerId}, cooldown until ${this.cooldownEndTime}`);
        
        // Schedule availability return
        setTimeout(() => {
            this.isAvailable = true;
            console.log(`🔄 PowerUp available again for player ${this.playerId} after failure cooldown`);
        }, this.failureCooldown);
        
        return true;
    }

    // Update method to check for window expiration
    update() {
        if (this.isActive) {
            const currentTime = Date.now();
            const windowExpired = (currentTime - this.activationTime) > this.windowDuration;
            
            if (windowExpired) {
                this.onFailure();
            }
        }
    }

    // Get current powerup state for client synchronization
    getState() {
        const currentTime = Date.now();
        return {
            playerId: this.playerId,
            isAvailable: this.isAvailable,
            isActive: this.isActive,
            canActivate: this.canActivate,
            remainingCooldown: Math.max(0, this.cooldownEndTime - currentTime),
            windowTimeLeft: this.isActive ? Math.max(0, this.windowDuration - (currentTime - this.activationTime)) : 0
        };
    }

    // Reset powerup state (useful for game resets)
    reset() {
        this.isAvailable = true;
        this.isActive = false;
        this.activationTime = 0;
        this.cooldownEndTime = 0;
    }
}
