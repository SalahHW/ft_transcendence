/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   gamePage.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/09 15:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/09 15:00:00 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { COMMON_CLASSES } from "../style/tailwindClasses.js";
import { buttonHTML } from "../components/button.js";

export default class GamePage {
	private _container: HTMLElement;

	constructor(containerId: string) {
		this._container = document.getElementById(containerId) as HTMLElement;
		if (!this._container)
			throw new Error(`Container ${containerId} not found`);
	}

	render(): void {
		this._container.innerHTML = /* HTML */ `
			<div class="w-full h-screen bg-black relative">
				<!-- Game Status Bar -->
				<div class="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-75 p-4">
					<div class="flex justify-between items-center text-white">
						<div class="flex items-center space-x-4">
							<h1 class="text-xl font-bold">Pong Game</h1>
							<div id="gameStatus" class="text-sm">Initializing...</div>
						</div>
						<div class="flex space-x-2">
							${buttonHTML({id: "leave-game-button", label: "Leave Game", type: "button"})}
						</div>
					</div>
				</div>

				<!-- Game Canvas -->
				<canvas id="renderCanvas" class="w-full h-full"></canvas>

				<!-- Game Controls Overlay -->
				<div class="absolute bottom-0 left-0 right-0 z-10 bg-black bg-opacity-75 p-4">
					<div class="text-white text-center">
						<div class="text-sm mb-2">Controls: Use ↑ and ↓ arrow keys to move your paddle</div>
						<div class="flex justify-center items-center space-x-8">
							<div id="player1Score" class="text-lg">Player 1: 0</div>
							<div class="text-xs">vs</div>
							<div id="player2Score" class="text-lg">Player 2: 0</div>
						</div>
					</div>
				</div>
			</div>
		`;

		this._setupEventListeners();
	}

	private _setupEventListeners(): void {
		// Leave game button
		const leaveButton = document.getElementById("leave-game-button");
		if (leaveButton) {
			leaveButton.addEventListener("click", () => {
				this._leaveGame();
			});
		}

		// Handle window resize for canvas
		window.addEventListener('resize', this._handleResize.bind(this));
	}

	private _leaveGame(): void {
		// Clean up game resources if needed
		const confirmLeave = confirm("Are you sure you want to leave the game?");
		if (confirmLeave) {
			console.log("Leave game confirmed, calling cleanup...");
			// Notify the game client to clean up properly
			if ((window as any).leaveGame) {
				console.log("Calling leaveGame cleanup function");
				(window as any).leaveGame();
			} else {
				console.error("leaveGame cleanup function not found on window");
			}
			// Navigate back to home or API test page
			window.history.back();
		}
	}

	private _handleResize(): void {
		const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
		if (canvas) {
			// Force canvas to resize to full window
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}
	}

	// Method to update game status
	public updateGameStatus(message: string): void {
		const statusElement = document.getElementById('gameStatus');
		if (statusElement) {
			statusElement.textContent = message;
		}
	}

	// Method to update scores
	public updateScores(player1Score: number, player2Score: number): void {
		const player1Element = document.getElementById('player1Score');
		const player2Element = document.getElementById('player2Score');
		
		if (player1Element) {
			player1Element.textContent = `Player 1: ${player1Score}`;
		}
		if (player2Element) {
			player2Element.textContent = `Player 2: ${player2Score}`;
		}
	}
} 