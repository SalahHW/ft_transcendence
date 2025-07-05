/**
 * Tournament WebSocket Manager
 * Handles tournament-specific WebSocket operations
 */

import { webSocketClient } from "../../webSocketClient/webSocketClient.js";
import { webSocketClientDisconnect } from "../../webSocketClient/webSocketClientDisconnect.js";
import { browserEventHandler } from "../../webSocketClient/BrowserEventHandler.js";
import { TournamentUI } from "./TournamentUI.js";

export class TournamentWebSocket {
  private tournamentWs: webSocketClient | null = null;
  private playerData: any = null;

  /**
   * Establish WebSocket connection for tournament waiting room
   */
  establishConnection(playerData: any): webSocketClient {
    this.playerData = playerData;
    
    if (!playerData.websocketUrl) {
      throw new Error('No WebSocket URL provided for tournament');
    }

    // Use secure WebSocket (wss://) when the page is served over HTTPS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${playerData.websocketUrl}`;
    console.log(`🏆 Establishing tournament WebSocket connection: ${wsUrl}`);
    
    // Pass playerId to constructor - it will handle URL properly now
    this.tournamentWs = new webSocketClient(wsUrl, playerData.id);
    
    // Handle tournament-specific messages
    this.tournamentWs.onMessage = (msg) => {
      const data = JSON.parse(msg.data);
      console.log('🏆 Tournament message received:', data);
      
      // Only handle waiting room status updates, not welcome messages
      if (data.type === 'tournamentWaitingRoomStatus') {
        console.log(`🏆 Waiting room status: ${data.playerCount}/${data.maxPlayers} players`);
        TournamentUI.updateTournamentWaitingRoomUI(data);
      }
    };
    
    // Set up tournament leave functionality
    (window as any).leaveGame = () => {
      this.leaveTournament();
    };
    
    // Initialize browser event handler for tournament
    browserEventHandler.initialize(this.tournamentWs, playerData.id, playerData.waitingRoomId || 'tournament');
    
    // Set up disconnect handler
    webSocketClientDisconnect.updateGameState({
      isGameOver: false,
      isGameLoopRunning: false,
      map: null,
      clientConnection: this.tournamentWs,
      player1: null,
      player2: null,
      ball: null,
      roomId: playerData.waitingRoomId || 'tournament',
      localPlayerId: playerData.id,
      isUpPressed: false,
      isDownPressed: false
    });

    return this.tournamentWs;
  }

  /**
   * Leave tournament
   */
  leaveTournament(): void {
    console.log('🏆 Tournament leave game called');
    
    if (this.tournamentWs && this.playerData) {
      this.tournamentWs.send({
        type: 'leaveTournament',
        playerId: this.playerData.id
      });
      this.tournamentWs.socket.close();
      console.log('🏆 Left tournament');
    }
  }

  /**
   * Get WebSocket connection
   */
  getConnection(): webSocketClient | null {
    return this.tournamentWs;
  }

  /**
   * Cleanup tournament WebSocket
   */
  cleanup(): void {
    if ((window as any).leaveGame) {
      delete (window as any).leaveGame;
    }
    browserEventHandler.cleanup();
    webSocketClientDisconnect.cleanup();
    
    if (this.tournamentWs) {
      this.tournamentWs.socket.close();
      this.tournamentWs = null;
    }
  }
} 