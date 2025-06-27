// Room module exports
export { Room } from './Room.js';
export { RoomManager, roomManager } from './RoomManager.js';
export { RoomMatchmaker, roomMatchmaker } from './RoomMatchmaker.js';

// Convenience exports for backward compatibility and easier imports
export const RoomModule = {
  Room,
  RoomManager,
  RoomMatchmaker,
  
  // Manager instances
  manager: roomManager,
  matchmaker: roomMatchmaker
}; 