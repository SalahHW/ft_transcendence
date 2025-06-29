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

                this.onFailure();
            }
        }
        

        
        return isMaxSpeedTier && notOnCooldown && this.isAvailable && !this.isActive;
    }

    // Activate the powerup (player pressed 'a')
    activate(ballRebounds) {
        if (!this.canActivate(ballRebounds)) {
            return false;
        }

        this.isActive = true;
        this.isAvailable = false;
        this.activationTime = Date.now();
        
        return true;
    }

    // Check if ball hit is within the activation window
    isWithinWindow(hitTime = Date.now()) {
        if (!this.isActive) {
            return false;
        }
        
        const timeSinceActivation = hitTime - this.activationTime;
        const withinWindow = timeSinceActivation >= 0 && timeSinceActivation <= this.windowDuration;
        
        // Auto-cleanup if window expired
        if (timeSinceActivation > this.windowDuration) {
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
        
        // Schedule availability return
        setTimeout(() => {
            this.isAvailable = true;
        }, this.successCooldown);
        
        return true;
    }

    // Handle failed powerup use (window expired without ball hit)
    onFailure() {
        if (!this.isActive) return false;
        
        this.isActive = false;
        this.cooldownEndTime = Date.now() + this.failureCooldown;
        
        // Schedule availability return
        setTimeout(() => {
            this.isAvailable = true;
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
