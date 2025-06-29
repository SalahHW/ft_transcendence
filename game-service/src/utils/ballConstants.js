// Ball Constants - Keep in sync with client-side
const BALL_CONSTANTS = {
    // Visual properties
    DIAMETER: 1.25,              // Ball visual diameter
    SEGMENTS: 42,                // Ball mesh segments for smoothness
    
    // Physics properties  
    RADIUS: 1.25 / 2,           // Physics radius (0.625) - CRITICAL: Must match client
    INITIAL_SPEED: 25,          // Initial ball speed
    
    // Position
    INITIAL_POSITION: {
        x: 0,
        y: -2,
        z: 0
    },
    
    // Speed tiers for glow effects (must match client)
    SPEED_TIERS: {
        TIER_1_THRESHOLD: 10   // Glow + trail (rebounds >= 10)
    },
    
    // Trail properties
    TRAIL: {
        ACTIVATION_TIER: 1,     // Speed tier when trail appears
        MAX_PARTICLES: 150,     // Number of trail particles
        LIFETIME: 0.6          // Particle lifetime in seconds
    }
};

// Game Physics Constants
const PHYSICS_CONSTANTS = {
    // Collision detection
    COLLISION_TOLERANCE: 0.01,   // Small buffer for collision detection
    
    // Boundaries (adjust based on court size)
    COURT: {
        WIDTH: 20,              // Court width
        LENGTH: 30,             // Court length  
        WALL_HEIGHT: 5          // Wall height for bounces
    }
};

// Export constants for use in game logic
export {
    BALL_CONSTANTS,
    PHYSICS_CONSTANTS
}; 