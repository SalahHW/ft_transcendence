import { z } from 'zod';
import { MESSAGE_TYPES } from '../core/constants.js';

export const messageTypeSchema = z.object({ type: z.nativeEnum(MESSAGE_TYPES) }).passthrough();

export const schemas = {
  [MESSAGE_TYPES.ANIMATION_COMPLETE]: z.object({
    type: z.literal(MESSAGE_TYPES.ANIMATION_COMPLETE),
  }),
  [MESSAGE_TYPES.SET_USERNAME]: z.object({
    type: z.literal(MESSAGE_TYPES.SET_USERNAME),
    playerId: z.string().optional(),
    username: z.string().trim().min(1),
  }),
  [MESSAGE_TYPES.KEY_DOWN]: z.object({
    type: z.literal(MESSAGE_TYPES.KEY_DOWN),
    direction: z.enum(['up', 'down']),
  }),
  [MESSAGE_TYPES.KEY_UP]: z.object({
    type: z.literal(MESSAGE_TYPES.KEY_UP),
    direction: z.enum(['up', 'down']),
  }),
  [MESSAGE_TYPES.PADDLE_POSITION]: z.object({
    type: z.literal(MESSAGE_TYPES.PADDLE_POSITION),
    positionZ: z.number(),
  }),
  [MESSAGE_TYPES.LEAVE_GAME]: z.object({
    type: z.literal(MESSAGE_TYPES.LEAVE_GAME),
  }),
  [MESSAGE_TYPES.REQUEST_BALL_RESPAWN]: z.object({
    type: z.literal(MESSAGE_TYPES.REQUEST_BALL_RESPAWN),
    isInitial: z.boolean().optional(),
  }),
  [MESSAGE_TYPES.KEEP_ALIVE]: z.object({
    type: z.literal(MESSAGE_TYPES.KEEP_ALIVE),
    reason: z.string().optional(),
    timestamp: z.number().optional(),
  }),
  [MESSAGE_TYPES.UPDATE_PLAYER_STATE]: z.object({
    type: z.literal(MESSAGE_TYPES.UPDATE_PLAYER_STATE),
    playerId: z.string().optional(),
    roomId: z.string().optional(),
    state: z.string(),
    timestamp: z.number().optional(),
  }),
  [MESSAGE_TYPES.BROWSER_EVENT]: z.object({
    type: z.literal(MESSAGE_TYPES.BROWSER_EVENT),
    playerId: z.string().optional(),
    roomId: z.string().optional(),
    eventType: z.string(),
    timestamp: z.number().optional(),
  }),
  powerupActivation: z.object({
    type: z.literal('powerupActivation'),
  }),
};
