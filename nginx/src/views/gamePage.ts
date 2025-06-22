import { COMMON_CLASSES } from "../style/tailwindClasses.js";
import { buttonHTML } from "../components/button.js";
import { updatePlayerNames, updateScoresUI, updateScoresUIVersus, updatePlayerNamesVersus, updateGameStatus } from "../game/playerUi/playerUi.js";
import { removeSplashScreen } from "../game/ui/splashScreen.js";

export default class GamePage {
	private _container: HTMLElement;
	private _leaveGameHandler?: () => void;
	private _resizeHandler?: () => void;

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
							<div id="player1Score" class="text-lg">Waiting: 0</div>
							<div class="text-xs">vs</div>
							<div id="player2Score" class="text-lg">Nobody: 0</div>
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
			// Store handler reference for cleanup
			this._leaveGameHandler = () => this._leaveGame();
			leaveButton.addEventListener("click", this._leaveGameHandler);
		}

		// Handle window resize for canvas - store reference for cleanup
		this._resizeHandler = this._handleResize.bind(this);
		window.addEventListener('resize', this._resizeHandler);
	}

	private _leaveGame(): void {
		// Clean up game resources if needed
		const confirmLeave = confirm("Are you sure you want to leave the game?");
		if (confirmLeave) {
			// Set flag to prevent double cleanup during navigation
			(window as any).gameCleanupInProgress = true;
			
			// Notify the game client to clean up properly
			if ((window as any).leaveGame) {
				(window as any).leaveGame();
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
		updateGameStatus(message);
	}

	// Method to update scores with usernames
	public updateScores(player1Score: number, player2Score: number, player1Name?: string, player2Name?: string): void {
		const player1Display = player1Name || 'Player 1';
		const player2Display = player2Name || 'Player 2';
		updateScoresUI(player1Score, player2Score, player1Display, player2Display);
	}

	// Method to update scores from current player's perspective (recommended)
	public updateScoresVersus(currentPlayerScore: number, opponentScore: number, currentPlayerName: string, opponentName: string): void {
		updateScoresUIVersus(currentPlayerScore, opponentScore, currentPlayerName, opponentName);
	}

	// Method to update just the player names (useful for initial setup)
	public updatePlayerNames(player1Name: string, player2Name: string): void {
		updatePlayerNames(player1Name, player2Name);
	}

	// Method to update player names from current player's perspective (recommended)
	public updatePlayerNamesVersus(currentPlayerName: string, opponentName: string): void {
		updatePlayerNamesVersus(currentPlayerName, opponentName);
	}

	// **CRITICAL**: Cleanup method to remove event listeners
	public cleanup(): void {
		// Remove splash screen if it exists
		removeSplashScreen();
		
		// Remove leave game button handler
		if (this._leaveGameHandler) {
			const leaveButton = document.getElementById("leave-game-button");
			if (leaveButton) {
				leaveButton.removeEventListener("click", this._leaveGameHandler);
			}
			this._leaveGameHandler = undefined;
		}

		// Remove resize handler
		if (this._resizeHandler) {
			window.removeEventListener('resize', this._resizeHandler);
			this._resizeHandler = undefined;
		}
	}
} 