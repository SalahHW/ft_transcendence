/**
 * Camera System - FPS Perspective Experiment
 * 
 * This module provides camera management for switching between
 * top-down and first-person perspectives in the Pong game.
 */

export { POVController, CameraPerspective } from './povController.js';
export type { CameraConfig } from './povController.js';

export { FPSCamera } from './fpsCamera.js';
export type { FPSCameraConfig } from './fpsCamera.js';

export { LightingController } from './lightingController.js';
export type { LightingConfig } from './lightingController.js';

export { CameraManager, cameraManager } from './cameraManager.js';

/**
 * Quick reference for camera perspectives:
 * 
 * TOP_DOWN - Traditional Pong view from above
 * FPS_PLAYER1 - First-person view from Player 1's paddle (right side)
 * FPS_PLAYER2 - First-person view from Player 2's paddle (left side)
 */ 