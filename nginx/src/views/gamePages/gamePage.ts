import { COMMON_CLASSES } from "../../style/tailwindClasses.js";
import { buttonHTML } from "../../components/button.js";
import { updatePlayerNames, updateScoresUI, updateScoresUIVersus, updatePlayerNamesVersus, updateGameStatus } from "../../game/playerUi/playerUi.js";
import { removeSplashScreen } from "../../game/ui/splashScreen.js";

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
			<div class="w-full h-screen bg-black relative font-sans">
				<!-- Game Status Bar -->
				<div class="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-80 p-6 border-b border-gray-700">
					<div class="flex justify-between items-center text-white">
						<div class="flex items-center space-x-6">
							<h1 class="text-4xl font-bold font-mono tracking-wider bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">PONG</h1>
							<div id="gameStatus" class="text-lg font-medium text-gray-300">Initializing...</div>
						</div>
						<div class="flex space-x-3">
							${buttonHTML({id: "leave-game-button", label: "Leave Game", type: "button"})}
						</div>
					</div>
				</div>

				<!-- Game Canvas -->
				<canvas id="renderCanvas" class="w-full h-full"></canvas>

				<!-- Game Controls Overlay -->
				<div class="absolute bottom-0 left-0 right-0 z-10 bg-black bg-opacity-80 p-6 border-t border-gray-700">
					<div class="text-white">
						<div class="text-xl mb-6 font-medium text-gray-300 text-center">Controls: Use <span class="font-mono text-blue-400">←</span> and <span class="font-mono text-blue-400">→</span> arrow keys to move your paddle</div>
						
						<!-- Scores and Controls Section - Same Line -->
						<div class="flex justify-between items-center">
							<!-- Hypershot Control - Left Side -->
							<div class="text-xl font-medium text-gray-300">
								<span class="text-yellow-400 font-mono">hypershot</span>
								<span class="text-white mx-2">:</span>
								<span class="font-mono text-yellow-300">A</span>
							</div>

							<!-- Scores Section - Center -->
							<div class="flex justify-center items-center space-x-8">
								<div id="player1Score" class="text-2xl font-bold font-mono tracking-wide">
									<span class="text-cyan-400">Waiting</span>
									<span class="text-white mx-3">:</span>
									<span class="text-cyan-300">0</span>
								</div>
								<div class="text-2xl font-bold text-gray-400 mx-12 px-4">VS</div>
								<div id="player2Score" class="text-2xl font-bold font-mono tracking-wide">
									<span class="text-red-400">Nobody</span>
									<span class="text-white mx-3">:</span>
									<span class="text-red-300">0</span>
								</div>
							</div>

							<!-- Right Side - Empty for balance -->
							<div class="text-xl opacity-0">placeholder</div>
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
		if (this._resizeHandler) {
			window.addEventListener('resize', this._resizeHandler);
		}
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
		const canvasElement = document.getElementById('renderCanvas');
		if (canvasElement && canvasElement instanceof HTMLCanvasElement) {
			// Force canvas to resize to full window
			canvasElement.width = window.innerWidth;
			canvasElement.height = window.innerHeight;
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
