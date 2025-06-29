// Ball Constants - Keep in sync with server-side
export const BALL_CONSTANTS = {
    // Visual properties
    DIAMETER: 1.25,              // Ball visual diameter
    SEGMENTS: 42,                // Ball mesh segments for smoothness
    
    // Physics properties  
    RADIUS: 1.25 / 2,           // Physics radius (0.625) - CRITICAL: Must match server
    INITIAL_SPEED: 25,          // Initial ball speed
    
    // Position
    INITIAL_POSITION: {
        x: 0,
        y: -2,
        z: 0
    },
    
    // Speed tiers for glow effects (must match server)
    SPEED_TIERS: {
        TIER_1_THRESHOLD: 10,   // First glow (rebounds >= 10)
        TIER_2_THRESHOLD: 20    // Max glow + trail (rebounds >= 20)
    },
    
    // Trail properties
    TRAIL: {
        ACTIVATION_TIER: 2,     // Speed tier when trail appears
        MAX_PARTICLES: 150,     // Number of trail particles
        LIFETIME: 0.6          // Particle lifetime in seconds
    }
}; 