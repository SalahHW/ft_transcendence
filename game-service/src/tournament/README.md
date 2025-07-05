# Tournament Management System

This directory contains the modular tournament management system for the Pong game.

## Structure

```
tournament/
├── README.md                    # This file
├── index.js                     # Main exports
├── constants.js                 # Tournament constants and configuration
├── TournamentManager.js         # Main orchestrator (simplified)
├── rooms/
│   └── TournamentRoomFactory.js # Room creation logic
├── waitingRoom/
│   └── PlayerManager.js         # Player management in waiting rooms
├── disconnect/
│   └── DisconnectHandler.js     # Disconnection handling
├── cleanup/
│   └── CleanupManager.js        # Inactivity cleanup and maintenance
└── broadcast/
    └── BroadcastManager.js      # Status broadcasting
```

## Components

### TournamentManager.js
Main orchestrator that coordinates all tournament operations. This is the primary interface for other parts of the system.

### constants.js
Contains all tournament-related constants:
- `TournamentPhases`: Tournament phases (WAITING, SEMI_FINALS, etc.)
- `TournamentRoomTypes`: Room types (WAITING, SEMI_FINAL_A, etc.)
- `TournamentConfig`: Configuration values (max players, timeouts, etc.)

### rooms/TournamentRoomFactory.js
Handles creation of tournament rooms:
- Waiting rooms
- Semi-final rooms
- Final rooms
- Tournament ID generation

### waitingRoom/PlayerManager.js
Manages player operations in waiting rooms:
- Adding players to tournaments
- Removing players
- Finding available rooms
- Player activity tracking

### disconnect/DisconnectHandler.js
Handles all disconnection scenarios:
- Waiting room disconnections
- Tournament room disconnections
- Semi-final disconnections
- Final disconnections
- Room cleanup

### cleanup/CleanupManager.js
Manages cleanup operations:
- Inactive player cleanup
- Duplicate username handling
- Periodic maintenance

### broadcast/BroadcastManager.js
Handles status broadcasting:
- Waiting room status updates
- Tournament start notifications
- Match assignments

## Usage

### Backend
```javascript
import { tournamentManager } from '../tournament/index.js';

// Add player to tournament
const result = await tournamentManager.addPlayerToTournament(playerId, username);

// Handle disconnection
tournamentManager.handlePlayerDisconnect(playerId, roomId);

// Get statistics
const stats = tournamentManager.getTournamentStats();
```

### Frontend
```typescript
import { handleTournament, cleanupTournament } from './tournament/index.js';

// Start tournament
await handleTournament(cache);

// Cleanup
cleanupTournament();
```

## Benefits of This Structure

1. **Separation of Concerns**: Each module has a specific responsibility
2. **Maintainability**: Easier to locate and modify specific functionality
3. **Testability**: Individual components can be tested in isolation
4. **Reusability**: Components can be reused in different contexts
5. **Readability**: Smaller, focused files are easier to understand
6. **Scalability**: New features can be added without affecting existing code

## Migration Notes

The original `TournamentManager.js` (720 lines) has been broken down into:
- Main orchestrator: ~150 lines
- 6 specialized modules: ~50-100 lines each
- Constants file: ~30 lines

All existing imports continue to work through the main `TournamentManager.js` file, ensuring backward compatibility. 