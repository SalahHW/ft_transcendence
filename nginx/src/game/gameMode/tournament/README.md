# Frontend Tournament Management

This directory contains the modular frontend tournament management system for the Pong game.

## Structure

```
tournament/
├── README.md                    # This file
├── index.ts                     # Main exports
├── TournamentHandler.ts         # Main orchestrator
├── TournamentUI.ts              # UI management
└── TournamentWebSocket.ts       # WebSocket management
```

## Components

### TournamentHandler.ts
Main orchestrator that coordinates tournament operations:
- Tournament initialization
- Player registration
- Game client loading
- Error handling

### TournamentUI.ts
Handles tournament-specific UI operations:
- Waiting room status updates
- Loading states
- Error states
- Status element creation

### TournamentWebSocket.ts
Manages tournament WebSocket connections:
- Connection establishment
- Message handling
- Leave functionality
- Cleanup operations

## Usage

### Basic Usage
```typescript
import { handleTournament, cleanupTournament } from './tournament/index.js';

// Start tournament
await handleTournament(cache);

// Cleanup
cleanupTournament();
```

### Advanced Usage
```typescript
import { TournamentHandler } from './tournament/TournamentHandler.js';
import { TournamentUI } from './tournament/TournamentUI.js';
import { TournamentWebSocket } from './tournament/TournamentWebSocket.js';

// Create handler instance
const handler = new TournamentHandler(cache);

// Handle tournament
await handler.handleTournament();

// Show custom UI
TournamentUI.showTournamentLoading();

// Manage WebSocket
const wsManager = new TournamentWebSocket();
const connection = wsManager.establishConnection(playerData);
```

## Migration Notes

The original `tournamentHandler.ts` (142 lines) has been broken down into:
- Main handler: ~80 lines
- UI manager: ~60 lines
- WebSocket manager: ~100 lines

All existing imports continue to work through the main `tournamentHandler.ts` file, ensuring backward compatibility.

## Benefits

1. **Separation of Concerns**: UI, WebSocket, and orchestration logic are separated
2. **Maintainability**: Easier to modify specific functionality
3. **Testability**: Individual components can be tested in isolation
4. **Reusability**: Components can be reused in different contexts
5. **Type Safety**: Better TypeScript support with focused interfaces 