/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   tournamentHandler.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/01/27 00:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/01/27 00:00:00 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import GamePage from "../../views/gamePages/gamePage.js";
import { getUserResponseData, registerCurrentUserForTournament } from "../utils/fetch.js";
import { webSocketClient } from "../webSocketClient/webSocketClient.js";
import { webSocketClientDisconnect } from "../webSocketClient/webSocketClientDisconnect.js";
import { browserEventHandler } from "../webSocketClient/BrowserEventHandler.js";

/**
 * Handles the logic for starting a tournament
 * @param cache - The route cache object to store the GamePage instance
 */
export async function handleTournament(cache: any): Promise<void> {
	try {
		const playerData = await registerCurrentUserForTournament();
		
		if (!cache.cache) {
			cache.cache = new GamePage("app-container");
		}
		cache.cache.render();
		
		// Establish WebSocket connection for tournament waiting room
		if (playerData.websocketUrl) {
			// Use secure WebSocket (wss://) when the page is served over HTTPS
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const wsUrl = `${protocol}//${window.location.host}${playerData.websocketUrl}`;
			console.log(`🏆 Establishing tournament WebSocket connection: ${wsUrl}`);
			
			// Pass playerId to constructor - it will handle URL properly now
			const tournamentWs = new webSocketClient(wsUrl, playerData.id);
			
			// Handle tournament-specific messages
			tournamentWs.onMessage = (msg) => {
				const data = JSON.parse(msg.data);
				console.log('🏆 Tournament message received:', data);
				
				// Only handle waiting room status updates, not welcome messages
				if (data.type === 'tournamentWaitingRoomStatus') {
					console.log(`🏆 Waiting room status: ${data.playerCount}/${data.maxPlayers} players`);
					updateTournamentWaitingRoomUI(data);
				}
			};
			
			// Store WebSocket connection for later use
			(cache.cache as any).tournamentWs = tournamentWs;
			
			// Set up tournament leave functionality
			(window as any).leaveGame = () => {
				console.log('🏆 Tournament leave game called');
				tournamentWs.send({
					type: 'leaveTournament',
					playerId: playerData.id
				});
				tournamentWs.socket.close();
				console.log('🏆 Left tournament');
			};
			
			// Initialize browser event handler for tournament
			browserEventHandler.initialize(tournamentWs, playerData.id, playerData.waitingRoomId || 'tournament');
			
			// Set up disconnect handler
			webSocketClientDisconnect.updateGameState({
				isGameOver: false,
				isGameLoopRunning: false,
				map: null,
				clientConnection: tournamentWs,
				player1: null,
				player2: null,
				ball: null,
				roomId: playerData.waitingRoomId || 'tournament',
				localPlayerId: playerData.id,
				isUpPressed: false,
				isDownPressed: false
			});
		}
		
		// Load the pre-bundled game client
		const gameBundlePath = "/js/game.bundle.js";
		const gameClientModule = await import(gameBundlePath);
		
		if (gameClientModule.setupJoinGameButton) {
			gameClientModule.setupJoinGameButton('tournament');
		}
		await gameClientModule.initializeGame(playerData.id, 'tournament');
		
	} catch (error) {
		console.error("Error registering user for tournament:", error);
	}
}

function updateTournamentWaitingRoomUI(data: any): void {
	// Update the UI to show waiting room status
	const container = document.getElementById('app-container');
	if (container) {
		const statusDiv = container.querySelector('.tournament-status') || createTournamentStatusElement();
		statusDiv.innerHTML = `
			<div class="tournament-waiting-room">
				<h3>🏆 Tournament Waiting Room</h3>
				<p>Players: ${data.playerCount}/${data.maxPlayers}</p>
				<p>${data.message || 'Waiting for more players...'}</p>
				<button onclick="leaveGame()" class="leave-tournament-btn">Leave Tournament</button>
			</div>
		`;
	}
}

function createTournamentStatusElement(): HTMLElement {
	const statusDiv = document.createElement('div');
	statusDiv.className = 'tournament-status';
	statusDiv.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		background: rgba(0, 0, 0, 0.8);
		color: white;
		padding: 15px;
		border-radius: 8px;
		z-index: 1000;
		font-family: Arial, sans-serif;
	`;
	document.body.appendChild(statusDiv);
	return statusDiv;
}

// Cleanup function for tournament
export function cleanupTournament() {
	if ((window as any).leaveGame) {
		delete (window as any).leaveGame;
	}
	browserEventHandler.cleanup();
	webSocketClientDisconnect.cleanup();
} 