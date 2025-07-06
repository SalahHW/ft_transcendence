// Game Configuration Constants
export const GAME_CONFIG = {
  // Performance Settings
  FPS: 240,                    // Server game loop FPS
  BROADCAST_FPS: 60,           // Network broadcast FPS
  SYNC_INTERVAL: 16,           // Milliseconds between sync messages (60Hz)
  
  // Player Settings
  PADDLE_SPEED: 20,            // Units per second
  PADDLE_BOUNDARY: 7.5,        // Half of playable area depth (-7.5 to +7.5)
  MAX_USERNAME_LENGTH: 20,     // Maximum characters in username
  MIN_USERNAME_LENGTH: 1,      // Minimum characters in username
  
  // Game Rules
  WINNING_SCORE: 2,           // Points needed to win
  MAX_SCORE_DIFFERENCE: 1,     // Minimum score difference to win
  
  // Ball Physics
  INITIAL_BALL_SPEED: 17,      // Starting ball velocity
  FIRST_SPEED_BOOST: 27,     // Speed after 10-19 rebounds
  SPEED_BOOST_THRESHOLD_1: 10, // First speed boost point
  SPEED_BOOST_THRESHOLD_2: 20, // Second speed boost point
  MAX_BALL_SPEED: 45,          // Maximum ball speed
  BALL_RESPAWN_DURATION: 3,    // Seconds for ball respawn animation
  
  // Timing
  ANIMATION_RETRY_DELAY: 200,  // Milliseconds between animation attempts
  INITIAL_ANIMATION_DELAY: 100, // Initial delay before animation
  MAX_ANIMATION_ATTEMPTS: 5,   // Maximum retries for ball animation
  
  // Network
  WEBSOCKET_READY_STATE: 1,    // WebSocket OPEN state
  REQUEST_TIMEOUT: 5000,       // HTTP request timeout in milliseconds
};

// Server Configuration
export const SERVER_CONFIG = {
  DEFAULT_HTTPS_PORT: 8080,
  DEFAULT_HTTP_PORT: 8081,
  CERT_PATH: 'src/server/certs/cert.pem',
  KEY_PATH: 'src/server/certs/key.pem',
  
  // CORS Settings
  ALLOWED_ORIGINS: [
    'http://localhost',
    'https://localhost', 
    'http://localhost:80',
    'https://localhost:80',
    'https://elsalmajori.games:8443',
    'https://elsalmajori.games'
  ],
  ALLOWED_METHODS: ['GET', 'POST'],
  ALLOWED_HEADERS: ['Content-Type', 'Authorization'],
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

// WebSocket Message Types
export const MESSAGE_TYPES = {
  // Client to Server
  SET_USERNAME: 'setUsername',
  KEY_DOWN: 'keyDown', 
  KEY_UP: 'keyUp',
  PADDLE_POSITION: 'paddlePosition',
  LEAVE_GAME: 'leaveGame',
  REQUEST_BALL_RESPAWN: 'requestBallRespawn',
  ANIMATION_COMPLETE: 'animationComplete',
  KEEP_ALIVE: 'keepAlive',
  UPDATE_PLAYER_STATE: 'updatePlayerState',
  BROWSER_EVENT: 'browserEvent',
  
  // Server to Client  
  INIT: 'init',
  PADDLE_MOVE: 'paddleMove',
  BALL_UPDATE: 'ballUpdate',
  SCORE_UPDATE: 'scoreUpdate',
  GAME_END: 'gameEnd',
  WAITING_FOR_PLAYERS: 'waitingForPlayers',
  SYNC: 'sync',
  SOUND_EVENT: 'soundEvent',
  ERROR: 'error',
  KEEP_ALIVE_ACK: 'keepAliveAck',
};

// Game States
export const GAME_STATES = {
  WAITING: 'waiting',
  READY: 'ready', 
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Disconnect Reasons
export const DISCONNECT_REASONS = {
  PLAYER_LEFT: 'player_left',
  DISCONNECT: 'disconnect',
  FORFEIT: 'forfeit',
};

// Logging Utilities
export const LOG_SEPARATORS = {
  SECTION: '='.repeat(60),
  SUBSECTION: '-'.repeat(60),
  MATCH_HEADER: '='.repeat(50),
}; 