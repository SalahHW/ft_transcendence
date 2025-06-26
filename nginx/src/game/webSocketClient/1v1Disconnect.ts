import { webSocketClient } from './webSocketClient.js';

/**
 * Client-side disconnection and cleanup handling for 1v1 games
 */

interface GameCleanupState {
    isGameOver: boolean;
    isGameLoopRunning: boolean;
    map: any;
    clientConnection: webSocketClient | null;
    player1: any;
    player2: any;
    ball: any;
    roomId: string | null;
    localPlayerId: string | null;
    isUpPressed: boolean;
    isDownPressed: boolean;
}

export class WebSocketClientDisconnect {
    private gameState: GameCleanupState;

    constructor() {
        this.gameState = {
            isGameOver: false,
            isGameLoopRunning: false,
            map: null,
            clientConnection: null,
            player1: null,
            player2: null,
            ball: null,
            roomId: null,
            localPlayerId: null,
            isUpPressed: false,
            isDownPressed: false
        };
    }

    /**
     * Update the game state reference for cleanup operations
     */
    updateGameState(gameState: Partial<GameCleanupState>): void {
        this.gameState = { ...this.gameState, ...gameState };
    }

    /**
     * Setup WebSocket disconnection event handlers
     */
    setupWebSocketDisconnectionHandlers(clientConnection: webSocketClient): void {
        clientConnection.socket.addEventListener('close', () => {
            console.log('🚪 WebSocket connection closed - cleaning up game');
            this.updateGameStatus('Connection closed');
            
            // Clean up game loop if it's running
            if (this.gameState.isGameLoopRunning && this.gameState.map && this.gameState.map.getEngine) {
                this.gameState.map.getEngine.stopRenderLoop();
                this.gameState.isGameLoopRunning = false;
            }
        });

        clientConnection.socket.addEventListener('error', (error) => {
            console.error('🔥 WebSocket error - cleaning up game:', error);
            this.updateGameStatus('Connection error');
            this.cleanup();
        });
    }

    /**
     * Handle explicit leave game action
     */
    leaveGame(): void {
        console.log('🏃 Player explicitly leaving game...');
        
        // Set game as over to immediately stop input and rendering
        this.gameState.isGameOver = true;
        
        // Send leave game message to server if connection exists
        if (this.gameState.clientConnection) {
            this.sendLeaveGameMessage();
        }
        
        // Perform cleanup
        this.cleanup();
    }

    /**
     * Send leave game message to server
     */
    private sendLeaveGameMessage(): void {
        const clientConnection = this.gameState.clientConnection;
        if (!clientConnection) return;

        try {
            if (clientConnection.leaveGame) {
                // Use the webSocketClient's leaveGame method
                clientConnection.leaveGame();
            } else if (clientConnection.socket?.readyState === WebSocket.OPEN) {
                // Fallback to manual message sending
                clientConnection.send({ 
                    type: 'leaveGame', 
                    playerId: this.gameState.localPlayerId 
                });
                
                // Give time for message to be sent before closing
                setTimeout(() => {
                    if (clientConnection?.socket?.readyState === WebSocket.OPEN) {
                        clientConnection.socket.close();
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error sending leave game message:', error);
        }
    }

    /**
     * Comprehensive cleanup of all game resources
     */
    cleanup(): void {
        console.log('🧹 Starting comprehensive game cleanup...');
        
        // Set game as over to immediately stop input and rendering
        this.gameState.isGameOver = true;
        
        // Stop game loop
        this.stopGameLoop();
        
        // Close WebSocket connection
        this.closeWebSocketConnection();
        
        // Clean up UI event listeners
        this.cleanupUIEventListeners();
        
        // Clean up keyboard event listeners
        this.cleanupKeyboardEventListeners();
        
        // Reset key states
        this.resetKeyStates();
        
        // Remove global functions
        this.removeGlobalFunctions();
        
        // Nullify game objects
        this.nullifyGameObjects();
        
        console.log('✅ Game cleanup completed');
    }

    /**
     * Stop the game rendering loop
     */
    private stopGameLoop(): void {
        if (this.gameState.isGameLoopRunning && this.gameState.map?.getEngine) {
            this.gameState.map.getEngine.stopRenderLoop();
            this.gameState.isGameLoopRunning = false;
            console.log('🛑 Game loop stopped');
        }
    }

    /**
     * Close WebSocket connection safely
     */
    private closeWebSocketConnection(): void {
        if (this.gameState.clientConnection?.socket?.readyState === WebSocket.OPEN) {
            try {
                this.gameState.clientConnection.socket.close();
                console.log('🔌 WebSocket connection closed');
            } catch (error) {
                console.error('Error closing WebSocket connection:', error);
            }
        }
    }

    /**
     * Clean up UI-related event listeners
     */
    private cleanupUIEventListeners(): void {
        // Clean up join game button handler
        if ((window as any).joinGameButtonHandler && (window as any).joinGameButtonSetup) {
            const joinGameBtn = document.getElementById('joinGameBtn') as HTMLButtonElement;
            if (joinGameBtn) {
                joinGameBtn.removeEventListener('click', (window as any).joinGameButtonHandler);
                console.log('🎮 Join game button event listener removed');
            }
            delete (window as any).joinGameButtonHandler;
            (window as any).joinGameButtonSetup = false;
        }
    }

    /**
     * Clean up keyboard event listeners
     */
    private cleanupKeyboardEventListeners(): void {
        if ((window as any).gameControlsInitialized) {
            if ((window as any).gameKeydownHandler) {
                document.removeEventListener('keydown', (window as any).gameKeydownHandler);
                delete (window as any).gameKeydownHandler;
                console.log('⌨️ Keydown event listener removed');
            }
            if ((window as any).gameKeyupHandler) {
                document.removeEventListener('keyup', (window as any).gameKeyupHandler);
                delete (window as any).gameKeyupHandler;
                console.log('⌨️ Keyup event listener removed');
            }
            (window as any).gameControlsInitialized = false;
        }
    }

    /**
     * Reset key input states to prevent stuck keys
     */
    private resetKeyStates(): void {
        this.gameState.isUpPressed = false;
        this.gameState.isDownPressed = false;
        console.log('🔄 Key states reset');
    }

    /**
     * Remove global functions from window object
     */
    private removeGlobalFunctions(): void {
        if ((window as any).leaveGame) {
            delete (window as any).leaveGame;
            console.log('🗑️ Global leaveGame function removed');
        }
    }

    /**
     * Nullify all game objects to free memory
     */
    private nullifyGameObjects(): void {
        this.gameState.clientConnection = null;
        this.gameState.player1 = null;
        this.gameState.player2 = null;
        this.gameState.ball = null;
        this.gameState.map = null;
        this.gameState.roomId = null;
        this.gameState.localPlayerId = null;
        console.log('🧹 Game objects nullified');
    }

    /**
     * Update game status in UI
     */
    private updateGameStatus(status: string): void {
        // This should be implemented based on your UI update mechanism
        // For now, just log the status
        console.log(`📊 Game Status: ${status}`);
        
        // Try to update UI if the update function exists
        if ((window as any).updateGameStatus) {
            (window as any).updateGameStatus(status);
        }
    }

    /**
     * Handle opponent disconnection notification
     */
    handleOpponentDisconnect(gameEndData: any): void {
        console.log('👥 Opponent disconnected - handling game end');
        
        // Stop game immediately
        this.gameState.isGameOver = true;
        this.stopGameLoop();
        
        // Show disconnection message
        this.updateGameStatus(`Opponent ${gameEndData.reason === 'opponent_disconnect' ? 'disconnected' : 'left'} - You win!`);
        
        // The game end will be handled by the normal game end flow
        // No need to cleanup here as it will be handled by the gameEnd event
    }

    /**
     * Check if game is in a state that requires disconnection handling
     */
    shouldHandleDisconnection(): boolean {
        return this.gameState.clientConnection !== null && 
               this.gameState.localPlayerId !== null &&
               !this.gameState.isGameOver;
    }

    /**
     * Get current disconnection state for debugging
     */
    getDisconnectionState(): any {
        return {
            hasConnection: this.gameState.clientConnection !== null,
            isGameOver: this.gameState.isGameOver,
            isGameLoopRunning: this.gameState.isGameLoopRunning,
            localPlayerId: this.gameState.localPlayerId,
            roomId: this.gameState.roomId
        };
    }
}

// Export singleton instance
export const webSocketClientDisconnect = new WebSocketClientDisconnect();

// Export utility functions for backward compatibility
export function leaveGame(): void {
    webSocketClientDisconnect.leaveGame();
}

export function cleanup(): void {
    webSocketClientDisconnect.cleanup();
}
