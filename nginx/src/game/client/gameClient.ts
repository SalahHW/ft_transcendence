/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   gameClient.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: edelarbr <edelarbr@student.42mulhouse.fr>  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/06/09 15:00:00 by edelarbr          #+#    #+#             */
/*   Updated: 2025/06/09 15:00:00 by edelarbr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { webSocketClient } from '../webSocketClient/webSocketClient.js';
import { gameMap } from '../map/gameMap.js';
import { playerPaddle } from '../player/player.js';
import { Ball } from '../ball/ball.js';
import { handleWaitingForPlayers } from '../ui/waitingStatusHandler.js';
import { TournamentClientHandler } from '../tournament/tournamentClientHandler.js';
import { showSplashScreen } from '../ui/splashScreen.js';

export class GameClient {
    private clientConnection: webSocketClient | null = null;
    private map: gameMap | null = null;
    private player1: playerPaddle | null = null;
    private player2: playerPaddle | null = null;
    private ball: Ball | null = null;
    private roomId: string | null = null;
    private localPlayerId: string | null = null;
    private isUpPressed: boolean = false;
    private isDownPressed: boolean = false;
    private isGameOver: boolean = false;
    private isGameLoopRunning: boolean = false;
    constructor() {
        // Initialize the game client
        console.log('Game client constructor started');
        console.log('Game client initialized successfully');
    }

    // Initialize the game with a registered player ID
    public async initializeGame(playerId: string): Promise<void> {
        console.log(`Initializing game for player: ${playerId}`);
        
        this.localPlayerId = playerId;
        console.log('Player ID set successfully');
        
        // Check if canvas exists
        console.log('Checking for canvas element...');
        const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
        if (!canvas) {
            console.error('Canvas element not found in DOM');
            throw new Error('Game canvas not found! Make sure the game page is rendered first.');
        }
        console.log('Canvas found successfully:', canvas);

        // FIXED: Use current domain instead of localhost for WebSocket connection
        // Initialize WebSocket connection using WSS for HTTPS or WS for HTTP
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/game/ws`;
        console.log('Creating WebSocket connection to:', wsUrl);
        
        this.clientConnection = new webSocketClient(wsUrl, playerId);
        console.log('WebSocket client created');

        this.setupWebSocketHandlers();
        this.setupKeyboardControls();
    }

    private setupWebSocketHandlers(): void {
        if (!this.clientConnection) return;

        this.clientConnection.socket.addEventListener('open', () => {
            console.log('WebSocket connection opened');
            this.updateGameStatus('Connected to game server');
        });

        this.clientConnection.socket.addEventListener('error', (err) => {
            console.error('WebSocket error:', err);
            this.updateGameStatus('Connection error');
        });

        this.clientConnection.socket.addEventListener('close', () => {
            console.log('WebSocket connection closed');
            this.updateGameStatus('Connection closed');
            this.cleanup();
        });

        // Set up game event handlers
        this.clientConnection.onInit(this.handleGameInit.bind(this));
        this.clientConnection.onPaddleMove(this.handlePaddleMove.bind(this));
        this.clientConnection.onBallUpdate(this.handleBallUpdate.bind(this));
        this.clientConnection.onSync(this.handleSync.bind(this));
        this.clientConnection.onScoreUpdate(this.handleScoreUpdate.bind(this));
        this.clientConnection.onGameEnd(this.handleGameEnd.bind(this));

        // Handle waiting status and tournament advancement
        this.clientConnection.socket.addEventListener('message', (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'waitingForPlayers') {
                    this.updateGameStatus(`Waiting for players... (${message.readyCount}/${message.totalNeeded} ready)`);
                    
                    // Handle waiting status and update player names
                    handleWaitingForPlayers(message, this.updateGameStatus.bind(this));
                } else if (message.type === 'tournamentAdvancement') {
                    TournamentClientHandler.handleTournamentAdvancement(message, this.updateGameStatus.bind(this), {
                        isGameOver: this.isGameOver,
                        isGameLoopRunning: this.isGameLoopRunning,
                        map: this.map,
                        ball: this.ball,
                        player1: this.player1,
                        player2: this.player2
                    });
                    
                    // Update instance variables after handler modifies them
                    if (message.status === 'transferred_to_final') {
                        // ⭐ CRITICAL FIX: Reset to false so final match can start
                        this.isGameOver = false;
                        this.isGameLoopRunning = false;
                        this.map = null;
                        this.ball = null;
                        this.player1 = null;
                        this.player2 = null;
                    }
                } else if (message.type === 'hideGameElements') {
                    TournamentClientHandler.handleHideGameElements(message, this.updateGameStatus.bind(this), {
                        ball: this.ball,
                        player1: this.player1,
                        player2: this.player2
                    });
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });
    }

    private async handleGameInit(data: any): Promise<void> {
        console.log('Received game init:', data);
        
        // ⭐ TOURNAMENT FIX: Reset game state for clean start (especially for final games)
        TournamentClientHandler.resetTournamentGameState({ 
            isGameOver: this.isGameOver, 
            isGameLoopRunning: this.isGameLoopRunning 
        });
        this.isGameOver = false;
        this.isGameLoopRunning = false;
        
        this.roomId = data.roomId;
        
        // Get player names for splash screen
        const currentPlayerName = data.playerName || 'You';
        const opponentName = data.opponentName || 'Opponent';
        
        // 🎬 Show splash screen BEFORE creating any game elements
        this.updateGameStatus('Preparing match...');
        
        try {
            // Show splash screen for 3 seconds
            await showSplashScreen(currentPlayerName, opponentName, 3000);
        } catch (error) {
            console.error('Error showing splash screen:', error);
            // Continue with game initialization even if splash screen fails
        }
        
        // NOW create the game elements AFTER splash screen
        
        // Create the game map if it doesn't exist
        if (!this.map) {
            this.map = new gameMap();
            this.map.createMap();
            this.map.createPlayground();
        }

        // ⭐ TOURNAMENT FIX: Always recreate players and game elements for clean start
        if (data.role === 0) {
            this.player1 = new playerPaddle('Player1', data.playerId, 0);
            this.player2 = new playerPaddle('Player2', data.opponentId, 1);
        } else {
            this.player1 = new playerPaddle('Player1', data.opponentId, 0);
            this.player2 = new playerPaddle('Player2', data.playerId, 1);
        }

        // ⭐ TOURNAMENT FIX: Reset scores display when game initializes
        this.updateScores(0, 0);
        console.log('✅ Score display reset to 0-0 for new game');

        // Create paddles and ensure they're visible
        if (this.map.getScene) {
            this.player1.createPaddle(this.map.getScene, 19.5, 2, 20);
            this.player2.createPaddle(this.map.getScene, -19.5, 2, 20);
            
            // ⭐ TOURNAMENT FIX: Reset paddle positions and ensure visibility
            TournamentClientHandler.resetTournamentPaddlePositions(this.player1, this.player2);
            TournamentClientHandler.ensureTournamentElementsVisible({ 
                ball: null, 
                player1: this.player1, 
                player2: this.player2 
            });
        }

        // Always recreate ball for clean start
        this.ball = new Ball(this.player1, this.player2);
        if (this.map.getScene) {
            this.ball.createBall(this.map.getScene);
            if (this.ball.ballBody) {
                this.ball.ballBody.metadata = { roomId: this.roomId };
                this.ball.ballBody.isVisible = true;
            }
            console.log('✅ GameClient: Ball and paddles created and made visible for new game');
        }

        this.updateGameStatus('Game starting...');

        // ⭐ TOURNAMENT FIX: Launch match animation and start fresh game loop
        try {
            if (this.map) {
                await this.map.launchMatchAnimation();
                
                // Notify server that animation is complete
                if (this.clientConnection) {
                    this.clientConnection.send({
                        type: 'animationComplete',
                        playerId: this.localPlayerId
                    });
                    console.log('Sent animationComplete to server');
                }
            }
            
            // ⭐ TOURNAMENT FIX: Ensure all game elements are visible and ready
            TournamentClientHandler.ensureTournamentElementsVisible({
                ball: this.ball,
                player1: this.player1,
                player2: this.player2
            });
            
            console.log('✅ GameClient: All tournament game elements configured');
            this.startGameLoop();
        } catch (error) {
            console.error('Error during game initialization:', error);
            // Send animation complete anyway to prevent server hanging
            if (this.clientConnection) {
                this.clientConnection.send({
                    type: 'animationComplete',
                    playerId: this.localPlayerId
                });
                console.log('Sent animationComplete to server (after error)');
            }
            this.startGameLoop(); // Start anyway
        }
    }

    private handlePaddleMove(msg: any): void {
        if (!this.player1 || !this.player2) return;
        
        const movingPlayer = msg.playerId === this.player1.getPlayerId() ? this.player1 : this.player2;
        
        if (movingPlayer && movingPlayer.getPlayerId() !== this.localPlayerId) {
            movingPlayer.setZ(msg.positionZ || 0);
        }
    }

    private handleBallUpdate(msg: any): void {
        if (!this.ball) return;
        
        if (msg.ballState?.isRespawning || msg.isInitialSpawn || msg.isScoreRespawn) {
            if (this.ball.ballBody) {
                this.ball.ballBody.isVisible = true;
            }
        }
        
        if (msg.ballState) {
            this.ball.setState(msg.ballState);
        }
    }

    private handleSync(msg: any): void {
        if (!this.player1 || !this.player2) return;
        
        if (msg.playerPositions) {
            Object.entries(msg.playerPositions).forEach(([playerId, positionZ]: [string, any]) => {
                const syncPlayer = playerId === this.player1!.getPlayerId() ? this.player1 : this.player2;
                if (syncPlayer && syncPlayer.getPlayerId() !== this.localPlayerId) {
                    syncPlayer.setZ(positionZ);
                }
            });
        }

        if (msg.ballState && this.ball) {
            this.ball.setState(msg.ballState);
        }
    }

    private handleScoreUpdate(msg: any): void {
        if (!this.player1 || !this.player2 || !this.map || !msg.scores) return;
        
        const player1Score = msg.scores[this.player1.getPlayerId()] || 0;
        const player2Score = msg.scores[this.player2.getPlayerId()] || 0;
        
        this.player1.playerScore = player1Score;
        this.player2.playerScore = player2Score;
        
        // Update UI scores
        this.updateScores(player1Score, player2Score);
        
        console.log(`Score update: Player1: ${player1Score}, Player2: ${player2Score}`);
    }

    private handleGameEnd(gameEndData: any): void {
        this.isGameOver = true;
        
        console.log('Game Over!', gameEndData);
        
        const isWinner = gameEndData.winner.id === this.localPlayerId;
        const resultText = isWinner 
            ? `🎉 YOU WON! Final Score: ${gameEndData.winner.score}-${gameEndData.loser.score}`
            : `😔 You Lost. Final Score: ${gameEndData.winner.score}-${gameEndData.loser.score}`;
        
        this.updateGameStatus(resultText);
    }

    private setupKeyboardControls(): void {
        if ((window as any).gameControlsInitialized) return;

        document.addEventListener('keydown', (event) => {
            if (this.isGameOver || !this.clientConnection) return;
            
            if (event.key === 'ArrowLeft' && !this.isUpPressed) {
                this.isUpPressed = true;
                this.clientConnection.send({ type: 'keyDown', direction: 'up' });
            } else if (event.key === 'ArrowRight' && !this.isDownPressed) {
                this.isDownPressed = true;
                this.clientConnection.send({ type: 'keyDown', direction: 'down' });
            }
        });

        document.addEventListener('keyup', (event) => {
            if (this.isGameOver || !this.clientConnection) return;
            
            if (event.key === 'ArrowLeft' && this.isUpPressed) {
                this.isUpPressed = false;
                this.clientConnection.send({ type: 'keyUp', direction: 'up' });
            } else if (event.key === 'ArrowRight' && this.isDownPressed) {
                this.isDownPressed = false;
                this.clientConnection.send({ type: 'keyUp', direction: 'down' });
            }
        });

        (window as any).gameControlsInitialized = true;
    }

    private startGameLoop(): void {
        if (this.isGameLoopRunning || !this.map) return;

        console.log('Starting game loop...');
        this.isGameLoopRunning = true;

        const renderLoop = () => {
            if (this.isGameOver || !this.map) {
                if (this.map?.getEngine) {
                    this.map.getEngine.stopRenderLoop();
                }
                this.isGameLoopRunning = false;
                return;
            }

            const deltaTime = this.map.getEngine!.getDeltaTime() / 1000;
            
            // Handle local player movement
            const localPlayer = this.player1?.getPlayerId() === this.localPlayerId ? this.player1 : this.player2;
            let paddleMoved = false;

            if (localPlayer) {
                if (this.isUpPressed && !this.isDownPressed) {
                    localPlayer.move(-1, deltaTime);
                    paddleMoved = true;
                } else if (this.isDownPressed && !this.isUpPressed) {
                    localPlayer.move(1, deltaTime);
                    paddleMoved = true;
                }

                // Send paddle position updates
                if (paddleMoved && this.clientConnection && localPlayer.getPaddleBodyPos) {
                    this.clientConnection.send({
                        type: 'paddlePosition',
                        playerId: this.localPlayerId,
                        positionZ: localPlayer.getPaddleBodyPos.z,
                    });
                }
            }

            // Render the scene
            if (this.map.getScene) {
                this.map.getScene.render();
            }
        };

        if (this.map.getEngine) {
            this.map.getEngine.runRenderLoop(renderLoop);
        }
    }

    private updateGameStatus(message: string): void {
        const statusElement = document.getElementById('gameStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    private updateScores(player1Score: number, player2Score: number): void {
        const player1Element = document.getElementById('player1Score');
        const player2Element = document.getElementById('player2Score');
        
        if (player1Element) {
            player1Element.textContent = `Player 1: ${player1Score}`;
        }
        if (player2Element) {
            player2Element.textContent = `Player 2: ${player2Score}`;
        }
    }

    public cleanup(): void {
        console.log('Cleaning up game client...');
        
        if (this.isGameLoopRunning && this.map?.getEngine) {
            this.map.getEngine.stopRenderLoop();
            this.isGameLoopRunning = false;
        }

        if (this.clientConnection?.socket.readyState === WebSocket.OPEN) {
            this.clientConnection.socket.close();
        }

        // ⭐ CLEANUP: Properly dispose of map resources
        if (this.map) {
            console.log('🗑️ Disposing map during cleanup...');
            this.map.dispose();
        }

        this.clientConnection = null;
        this.player1 = null;
        this.player2 = null;
        this.ball = null;
        this.map = null;
        this.roomId = null;
        this.localPlayerId = null;
        this.isGameOver = false;
    }

    public leaveGame(): void {
        console.log('Player leaving game...');
        
        // Set game as over to stop input and rendering
        this.isGameOver = true;
        
        // Stop the game loop immediately
        if (this.isGameLoopRunning && this.map?.getEngine) {
            this.map.getEngine.stopRenderLoop();
            this.isGameLoopRunning = false;
        }

        // Send leave game message to server
        if (this.clientConnection) {
            this.clientConnection.leaveGame();
        }

        // Clean up remaining resources
        this.player1 = null;
        this.player2 = null;
        this.ball = null;
        this.map = null;
        this.roomId = null;
        this.localPlayerId = null;
    }
} 