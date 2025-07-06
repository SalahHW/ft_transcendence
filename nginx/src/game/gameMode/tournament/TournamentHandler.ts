/**
 * Tournament Handler
 * Main orchestrator for tournament operations
 */

import GamePage from "../../../views/gamePages/gamePage.js";
import { getUserResponseData, registerCurrentUserForTournament } from "../../utils/fetch.js";
import { TournamentUI } from "./TournamentUI.js";
import { TournamentWebSocket } from "./TournamentWebSocket.js";
import { GameClient } from "../../client/gameClient.js";

export class TournamentHandler {
  private cache: any;
  private webSocketManager: TournamentWebSocket;
  private gameClient: GameClient | null = null;

  constructor(cache: any) {
    this.cache = cache;
    this.webSocketManager = new TournamentWebSocket();
  }

  /**
   * Handle the logic for starting a tournament
   */
  async handleTournament(): Promise<void> {
    try {
      // Show loading state
      TournamentUI.showTournamentLoading();
      
      const playerData = await registerCurrentUserForTournament();
      
      if (!this.cache.cache) {
        this.cache.cache = new GamePage("app-container");
      }
      this.cache.cache.render();
      
      // Create game client instance for tournament
      this.gameClient = new GameClient();
      
      // Establish WebSocket connection for tournament waiting room
      if (playerData.websocketUrl) {
        const tournamentWs = this.webSocketManager.establishConnection(playerData);
        
        // Store WebSocket connection for later use
        (this.cache.cache as any).tournamentWs = tournamentWs;
        
        // Pass the WebSocket connection to the game client
        this.gameClient.setWebSocketConnection(tournamentWs);
      }
      
      // Initialize the game client for tournament mode
      await this.gameClient.initializeGame(playerData.id, true); // true = tournament mode
      
    } catch (error) {
      console.error("Error registering user for tournament:", error);
      TournamentUI.showTournamentError("Failed to join tournament. Please try again.");
    }
  }

  /**
   * Cleanup function for tournament
   */
  async cleanup(): Promise<void> {
    await this.webSocketManager.cleanup();
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function handleTournament(cache: any): Promise<void> {
  const handler = new TournamentHandler(cache);
  await handler.handleTournament();
}

/**
 * Legacy cleanup function for backward compatibility
 */
export function cleanupTournament(): void {
  // This will be called by the handler instance
  // For now, we'll handle cleanup through the WebSocket manager
} 