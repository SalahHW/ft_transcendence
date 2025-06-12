// Player module exports
export { Player } from './Player.js';
export { PlayerManager, playerManager } from './PlayerManager.js';
export { PlayerInput, playerInput } from './PlayerInput.js';

// Convenience exports for backward compatibility and easier imports
export const PlayerModule = {
  Player,
  PlayerManager,
  PlayerInput,
  
  // Manager instances
  manager: playerManager,
  input: playerInput
}; 