import { webSocketClient } from './webSocketClient.js';
import { webSocketClientDisconnect } from './webSocketClientDisconnect.js';

/**
 * Browser event handler for disconnect detection
 * Detects browser navigation, refresh, and close events
 */

export class BrowserEventHandler {
  private clientConnection: webSocketClient | null = null;
  private playerId: string | null = null;
  private roomId: string | null = null;
  private isInitialized: boolean = false;
  private heartbeatInterval: number | null = null;
  private lastActivity: number = Date.now();
  private cleanupPerformed: boolean = false;
  
  // Store bound event handlers for proper cleanup
  private boundBeforeUnloadHandler: (event: BeforeUnloadEvent) => void;
  private boundPageHideHandler: (event: PageTransitionEvent) => void;
  private boundUnloadHandler: (event: Event) => void;
  private boundVisibilityChangeHandler: () => void;
  private boundPopStateHandler: (event: PopStateEvent) => void;

  constructor() {
    // Initialize bound event handlers
    this.boundBeforeUnloadHandler = this.handleBeforeUnload.bind(this);
    this.boundPageHideHandler = this.handlePageHide.bind(this);
    this.boundUnloadHandler = this.handleUnload.bind(this);
    this.boundVisibilityChangeHandler = this.handleVisibilityChange.bind(this);
    this.boundPopStateHandler = this.handlePopState.bind(this);
  }

  /**
   * Initialize browser event handler
   */
  initialize(clientConnection: webSocketClient, playerId: string, roomId: string): void {
    console.log(`🌐 Initializing browser event handler for player ${playerId} in room ${roomId}`);
    console.log(`🌐 Client connection:`, !!clientConnection);
    
    this.clientConnection = clientConnection;
    this.playerId = playerId;
    this.roomId = roomId;
    this.isInitialized = true;
    this.cleanupPerformed = false;
    
    this.setupEventListeners();
    this.startHeartbeat();
    console.log(`🌐 Browser event handler initialized for player ${playerId}`);
  }

  /**
   * Setup browser event listeners
   */
  private setupEventListeners(): void {
    // Handle page unload (navigation, refresh, close)
    window.addEventListener('beforeunload', this.boundBeforeUnloadHandler);
    
    // Handle page hide (tab switching, browser close)
    window.addEventListener('pagehide', this.boundPageHideHandler);
    
    // Handle unload (final event before page is destroyed)
    window.addEventListener('unload', this.boundUnloadHandler);
    
    // Handle popstate (browser back/forward navigation)
    window.addEventListener('popstate', this.boundPopStateHandler);
    
    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', this.boundVisibilityChangeHandler);
    
    console.log('🌐 Browser event listeners setup completed');
  }

  /**
   * Handle beforeunload event
   */
  private handleBeforeUnload(event: BeforeUnloadEvent): void {
    console.log('🌐 Browser beforeunload detected, initialized:', this.isInitialized);
    if (!this.isInitialized) {
      console.log('🌐 Browser event handler not initialized, ignoring beforeunload');
      return;
    }
    
    console.log('🌐 Browser beforeunload detected - notifying server and performing cleanup');
    this.notifyServer('beforeunload');
    this.performClientCleanup();
    
    // Show confirmation dialog for unsaved changes
    event.preventDefault();
    event.returnValue = 'Are you sure you want to leave? Your game will be forfeited.';
  }

  /**
   * Handle pagehide event
   */
  private handlePageHide(event: PageTransitionEvent): void {
    console.log('🌐 Browser pagehide detected, initialized:', this.isInitialized);
    if (!this.isInitialized) {
      console.log('🌐 Browser event handler not initialized, ignoring pagehide');
      return;
    }
    
    console.log('🌐 Browser pagehide detected - notifying server and performing cleanup');
    this.notifyServer('pagehide');
    this.performClientCleanup();
  }

  /**
   * Handle unload event
   */
  private handleUnload(event: Event): void {
    console.log('🌐 Browser unload detected, initialized:', this.isInitialized);
    if (!this.isInitialized) {
      console.log('🌐 Browser event handler not initialized, ignoring unload');
      return;
    }
    
    console.log('🌐 Browser unload detected - notifying server and performing cleanup');
    this.notifyServer('unload');
    this.performClientCleanup();
  }

  /**
   * Handle popstate event (browser back/forward navigation)
   */
  private handlePopState(event: PopStateEvent): void {
    console.log('🌐 Browser popstate detected, initialized:', this.isInitialized);
    if (!this.isInitialized) {
      console.log('🌐 Browser event handler not initialized, ignoring popstate');
      return;
    }
    
    console.log('🌐 Browser popstate detected - notifying server and performing cleanup');
    this.notifyServer('popstate');
    this.performClientCleanup();
  }

  /**
   * Handle visibility change event
   */
  private handleVisibilityChange(): void {
    if (!this.isInitialized) return;
    
    if (document.hidden) {
      console.log('🌐 Page visibility changed to hidden');
      // Set a timeout to detect if page is hidden for too long (navigation)
      setTimeout(() => {
        if (document.hidden && this.isInitialized) {
          console.log('🌐 Page has been hidden for too long, treating as navigation');
          this.notifyServer('visibility_timeout');
          this.performClientCleanup();
        }
      }, 5000); // 5 seconds timeout
    } else {
      console.log('🌐 Page visibility changed to visible');
    }
  }

  /**
   * Perform client-side cleanup for browser navigation events
   */
  private performClientCleanup(): void {
    if (this.cleanupPerformed) {
      console.log('🧹 Client cleanup already performed, skipping');
      return;
    }

    console.log('🧹 Performing client-side cleanup for browser navigation');
    
    try {
      // Update game state before cleanup
      if (webSocketClientDisconnect) {
        webSocketClientDisconnect.updateGameState({
          isGameOver: true,
          isGameLoopRunning: false,
          map: null,
          clientConnection: this.clientConnection,
          player1: null,
          player2: null,
          ball: null,
          roomId: this.roomId,
          localPlayerId: this.playerId,
          isUpPressed: false,
          isDownPressed: false
        });
        
        // Perform cleanup but don't close WebSocket immediately
        webSocketClientDisconnect.cleanup(false);
      }
      
      // Clean up global game state
      if ((window as any).clientConnection) {
        (window as any).clientConnection = null;
      }
      
      // Stop any ongoing game loops
      if ((window as any).gameLoopRunning) {
        (window as any).gameLoopRunning = false;
      }
      
      // Clean up keyboard handlers
      if ((window as any).gameKeydownHandler) {
        document.removeEventListener('keydown', (window as any).gameKeydownHandler);
        delete (window as any).gameKeydownHandler;
      }
      
      if ((window as any).gameKeyupHandler) {
        document.removeEventListener('keyup', (window as any).gameKeyupHandler);
        delete (window as any).gameKeyupHandler;
      }
      
      // Reset game control flags
      (window as any).gameControlsInitialized = false;
      (window as any).joinGameButtonSetup = false;
      
      // Close WebSocket connection after a short delay to ensure browser event message is sent
      setTimeout(() => {
        if (this.clientConnection?.socket?.readyState === WebSocket.OPEN) {
          try {
            this.clientConnection.socket.close();
            console.log('🔌 WebSocket connection closed after browser event');
          } catch (error) {
            console.error('Error closing WebSocket after browser event:', error);
          }
        }
      }, 500); // 500ms delay to ensure message is sent
      
      this.cleanupPerformed = true;
      console.log('✅ Client-side cleanup completed for browser navigation');
    } catch (error) {
      console.error('Error during client-side cleanup:', error);
    }
  }

  /**
   * Notify server of browser event
   */
  private notifyServer(eventType: string): void {
    console.log(`🌐 Attempting to notify server of browser event: ${eventType}`);
    console.log(`🌐 Client connection:`, !!this.clientConnection);
    console.log(`🌐 Player ID:`, this.playerId);
    console.log(`🌐 Room ID:`, this.roomId);
    
    if (!this.clientConnection || !this.playerId || !this.roomId) {
      console.warn('Browser event handler not properly initialized');
      return;
    }

    // Check WebSocket connection state
    const wsState = this.clientConnection.socket.readyState;
    console.log(`🌐 WebSocket readyState:`, wsState, `(OPEN=${WebSocket.OPEN})`);
    
    if (wsState !== WebSocket.OPEN) {
      console.warn(`🌐 WebSocket not open (state: ${wsState}), cannot send browser event`);
      return;
    }

    try {
      const message = {
        type: 'browserEvent',
        playerId: this.playerId,
        roomId: this.roomId,
        eventType: eventType,
        timestamp: Date.now()
      };
      
      console.log(`🌐 Sending browser event message:`, message);
      this.clientConnection.send(message);
      
      console.log(`🌐 Successfully sent browser event notification: ${eventType}`);
    } catch (error) {
      console.error('Error sending browser event notification:', error);
    }
  }

  /**
   * Clean up browser event handler
   */
  cleanup(): void {
    if (this.isInitialized) {
      // Stop heartbeat
      this.stopHeartbeat();
      
      // Remove event listeners using stored bound handlers
      window.removeEventListener('beforeunload', this.boundBeforeUnloadHandler);
      window.removeEventListener('pagehide', this.boundPageHideHandler);
      window.removeEventListener('unload', this.boundUnloadHandler);
      window.removeEventListener('popstate', this.boundPopStateHandler);
      document.removeEventListener('visibilitychange', this.boundVisibilityChangeHandler);
      
      this.clientConnection = null;
      this.playerId = null;
      this.roomId = null;
      this.isInitialized = false;
      this.cleanupPerformed = false;
      
      console.log('🧹 Browser event handler cleaned up');
    }
  }

  /**
   * Check if handler is initialized
   */
  isHandlerInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Update room ID after initialization
   */
  updateRoomId(newRoomId: string): void {
    this.roomId = newRoomId;
    console.log(`🔄 Browser event handler room ID updated to: ${newRoomId}`);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.lastActivity = Date.now();
    
    // Send heartbeat every 10 seconds
    this.heartbeatInterval = window.setInterval(() => {
      this.updateActivity();
      
      // Check if we should send a heartbeat to the server
      if (this.clientConnection && this.isInitialized) {
        try {
          this.clientConnection.send({
            type: 'keepAlive',
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Error sending heartbeat:', error);
        }
      }
    }, 10000);
    
    console.log('💓 Browser event handler heartbeat started');
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('💓 Browser event handler heartbeat stopped');
    }
  }

  /**
   * Update activity timestamp
   */
  private updateActivity(): void {
    this.lastActivity = Date.now();
  }
}

// Export singleton instance
export const browserEventHandler = new BrowserEventHandler(); 