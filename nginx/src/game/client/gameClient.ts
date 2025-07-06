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
import { TournamentClientHandler } from '../gameMode/tournament/TournamentClientHandler.js';
import { showSplashScreen } from '../ui/splashScreen.js';
import { cameraManager } from '../camera/cameraManager.js';
import { updatePlayerNamesVersus, updateScoresUIVersus } from '../playerUi/playerUi.js';
import * as BABYLON from '@babylonjs/core';

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
    private isIntroAnimationRunning: boolean = false;
    private isGameStarted: boolean = false;
    constructor() {
        // Initialize the game client
    }

    // Initialize the game with a registered player ID
    public async initializeGame(playerId: string, isTournamentMode: boolean = false): Promise<void> {
        this.localPlayerId = playerId;
        
        // Check if canvas exists
        const canvasElement = document.getElementById('renderCanvas');
        if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) {
            console.error('Canvas element not found in DOM');
            throw new Error('Game canvas not found! Make sure the game page is rendered first.');
        }
        const canvas = canvasElement;

        // For tournament mode, we don't create a new WebSocket connection
        // as the player is already connected through the tournament waiting room
        if (!isTournamentMode) {
            // FIXED: Use current domain instead of localhost for WebSocket connection
            // Initialize WebSocket connection using WSS for HTTPS or WS for HTTP
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/game/ws`;
            
            this.clientConnection = new webSocketClient(wsUrl, playerId);
            this.setupWebSocketHandlers();
        } else {
            // Tournament mode: Using existing WebSocket connection
        }

        this.setupKeyboardControls();
    }

    // Set WebSocket connection for tournament mode
    public setWebSocketConnection(connection: webSocketClient): void {
        this.clientConnection = connection;
        this.setupWebSocketHandlers();
    }

    // Initialize tournament game with provided match data
    public async initializeTournamentGame(matchData: any): Promise<void> {
        // Tournament game initialization
        
        // Reset game state for clean start
        TournamentClientHandler.resetTournamentGameState({ 
            isGameOver: this.isGameOver, 
            isGameLoopRunning: this.isGameLoopRunning 
        });
        this.isGameOver = false;
        this.isGameLoopRunning = false;
        
        this.roomId = matchData.roomId;
        this.localPlayerId = matchData.playerId;
        
        // Create the game map if it doesn't exist
        if (!this.map) {
            this.map = new gameMap();
            this.map.createMap();
            this.map.createPlayground();
        }

        // ⭐ FIX: Create players with actual names (like 1v1 client)
        const player1Name = matchData.role === 0 ? matchData.playerName : matchData.opponentName;
        const player2Name = matchData.role === 0 ? matchData.opponentName : matchData.playerName;
        
        if (matchData.role === 0) {
            this.player1 = new playerPaddle(player1Name, matchData.playerId, 0);
            this.player2 = new playerPaddle(player2Name, matchData.opponentId, 1);
        } else {
            this.player1 = new playerPaddle(player1Name, matchData.opponentId, 0);
            this.player2 = new playerPaddle(player2Name, matchData.playerId, 1);
        }

                    // Create paddles in the scene with correct positions
            try {
                this.player1.createPaddle(this.map.getScene!, 19.5, 2, 20);
                this.player2.createPaddle(this.map.getScene!, -19.5, 2, 20);
                
                // Reset paddle positions
                this.player1.setZ(0);
                this.player2.setZ(0);
            } catch (e) {
                console.error('Tournament paddle creation failed:', e);
                return;
            }

        // Create fresh ball
        if (!this.ball) {
            this.ball = new Ball(this.player1, this.player2);
            this.ball.createBall(this.map.getScene!);
            if (this.ball.ballBody) {
                this.ball.ballBody.metadata = { roomId: this.roomId };
                this.ball.ballBody.position.set(0, -2, 0);
                this.ball.ballBody.isVisible = true; 
            }
            this.ball.position.set(0, -2, 0);
            this.ball.isRespawning = true;
            this.ball.hasValidPosition = true;
        }

        // Initialize camera manager (CRITICAL for POV switching)
        if (this.map && this.player1 && this.player2 && this.localPlayerId) {
            cameraManager.initialize(this.map, this.player1, this.player2, this.localPlayerId);
        }

        // ⭐ FIX: Update player names in UI using proper styled functions
        updateScoresUIVersus(0, 0, matchData.playerName || 'Player', matchData.opponentName || 'Opponent');
        updatePlayerNamesVersus(matchData.playerName || 'Player', matchData.opponentName || 'Opponent');

        // Ensure all game elements are visible
        TournamentClientHandler.ensureTournamentElementsVisible({
            ball: null,
            player1: this.player1,
            player2: this.player2
        });

        // Launch match animation and start game loop
        try {
            if (this.map) {
                // Ensure ball is not visible during the animation
                if (this.ball?.ballBody) {
                    this.ball.ballBody.isVisible = false;
                }

                this.isIntroAnimationRunning = true;
                await this.map.launchMatchAnimation();
                this.isIntroAnimationRunning = false;
                
                // CRITICAL: Switch to FPS perspective after animation
                cameraManager.switchToFPSAfterAnimation();
                
                // Re-enforce visibility after animation completes
                if (this.player1?.paddleBody) {
                    this.player1.paddleBody.isVisible = true;
                }
                if (this.player2?.paddleBody) {
                    this.player2.paddleBody.isVisible = true;
                }
                if (this.ball?.ballBody) {
                    this.ball.ballBody.isVisible = true;
                }
                
                // CRITICAL: Send animationComplete FIRST, then request ball respawn
                if (this.clientConnection) {
                    this.clientConnection.send({
                        type: 'animationComplete',
                        playerId: this.localPlayerId
                    });
                    
                    // Wait a moment for server to process animation complete, then request ball respawn
                    setTimeout(() => {
                        if (this.clientConnection) {
                            this.clientConnection.send({
                                type: 'requestBallRespawn',
                                isInitial: true
                            });
                        }
                    }, 100); // Small delay to ensure proper order
                }
            }
            
            // Ensure all game elements are visible and ready
            TournamentClientHandler.ensureTournamentElementsVisible({
                ball: null,
                player1: this.player1,
                player2: this.player2
            });
            
            this.startGameLoop();
        } catch (error) {
            console.error('Error during tournament game initialization:', error);
            
            // Re-enforce visibility after error
            if (this.player1?.paddleBody) {
                this.player1.paddleBody.isVisible = true;
            }
            if (this.player2?.paddleBody) {
                this.player2.paddleBody.isVisible = true;
            }
            if (this.ball?.ballBody) {
                this.ball.ballBody.isVisible = true;
            }
            
            // Send animation complete first, then ball respawn request (after error)
            if (this.clientConnection) {
                this.clientConnection.send({
                    type: 'animationComplete',
                    playerId: this.localPlayerId
                });
                
                // Wait a moment for server to process animation complete, then request ball respawn
                setTimeout(() => {
                    if (this.clientConnection) {
                        this.clientConnection.send({
                            type: 'requestBallRespawn',
                            isInitial: true
                        });
                    }
                }, 100); // Small delay to ensure proper order
            }
            this.startGameLoop(); // Start anyway
        }
    }

    private setupWebSocketHandlers(): void {
        if (!this.clientConnection) return;

        this.clientConnection.socket.addEventListener('open', () => {
            this.updateGameStatus('Connected to game server');
        });

        this.clientConnection.socket.addEventListener('error', (err) => {
            console.error('WebSocket error:', err);
            this.updateGameStatus('Connection error');
        });

        this.clientConnection.socket.addEventListener('close', () => {
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
                        
                        // Update game status with the message from server
                        if (message.message) {
                            this.updateGameStatus(message.message);
                        }
                    } else if (message.status === 'tournament_complete') {
                        // Tournament is complete, show final results
                        this.isGameOver = true;
                        this.isGameLoopRunning = false;
                        
                        if (message.message) {
                            this.updateGameStatus(message.message);
                        }
                        
                        if (message.winner) {
                            const isWinner = message.winner.id === this.localPlayerId;
                            const resultText = isWinner 
                                ? `🏆 You won the tournament!`
                                : `🏆 Tournament complete! Winner: ${message.winner.username}`;
                            this.updateGameStatus(resultText);
                        }
                    }
                } else if (message.type === 'hideGameElements') {
                    TournamentClientHandler.handleHideGameElements(message, this.updateGameStatus.bind(this), {
                        ball: this.ball,
                        player1: this.player1,
                        player2: this.player2
                    });
                } else if (message.type === 'matchAssignment') {
                    // Handle match assignment for tournament
                    TournamentClientHandler.handleMatchAssignment(message, this.updateGameStatus.bind(this));
                } else if (message.type === 'gameInit') {
                    // Handle game initialization for tournament matches
                    TournamentClientHandler.handleGameInit(message, this.updateGameStatus.bind(this), this);
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });
    }

    private async handleGameInit(data: any): Promise<void> {
        
        // Check if this is a tournament match
        const isTournamentMatch = data.matchType === 'tournament_semi_final' || 
                                 data.matchType === 'tournament_winner_final' || 
                                 data.matchType === 'tournament_loser_final';
        
        if (isTournamentMatch) {
            // For tournament matches, the splash screen is already shown by TournamentClientHandler
            // and the game initialization is handled there
            return;
        }
        
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

        // Create fresh ball (important for tournament final matches)
        if (!this.ball) {
            this.ball = new Ball(this.player1, this.player2);
            this.ball.createBall(this.map.getScene!);
            if (this.ball.ballBody) {
                this.ball.ballBody.metadata = { roomId: this.roomId };
                this.ball.ballBody.position.set(0, -2, 0);
                this.ball.ballBody.isVisible = true; 
            }
            this.ball.position.set(0, -2, 0);
            this.ball.isRespawning = true;
            this.ball.hasValidPosition = true;
        }

        // ⭐ TOURNAMENT FIX: Ensure all game elements are visible for new game
        TournamentClientHandler.ensureTournamentElementsVisible({
            ball: null,
            player1: this.player1,
            player2: this.player2
        });

        // ⭐ TOURNAMENT FIX: Launch match animation and start fresh game loop
        try {
            if (this.map) {
                // Ensure ball is not visible during the animation
                if (this.ball?.ballBody) {
                    this.ball.ballBody.isVisible = false;
                }

                this.isIntroAnimationRunning = true;
                await this.map.launchMatchAnimation();
                this.isIntroAnimationRunning = false;
                
                // CRITICAL: Send animationComplete FIRST, then request ball respawn
                if (this.clientConnection) {
                    this.clientConnection.send({
                        type: 'animationComplete',
                        playerId: this.localPlayerId
                    });
                    
                    // Wait a moment for server to process animation complete, then request ball respawn
                    setTimeout(() => {
                        if (this.clientConnection) {
                            this.clientConnection.send({
                                type: 'requestBallRespawn',
                                isInitial: true
                            });
                        }
                    }, 100); // Small delay to ensure proper order
                }
            }
            
            // ⭐ TOURNAMENT FIX: Ensure all game elements are visible and ready
            TournamentClientHandler.ensureTournamentElementsVisible({
                ball: null,
                player1: this.player1,
                player2: this.player2
            });
            
            this.startGameLoop();
        } catch (error) {
            console.error('Error during game initialization:', error);
            // Send animation complete first, then ball respawn request (after error)
            if (this.clientConnection) {
                this.clientConnection.send({
                    type: 'animationComplete',
                    playerId: this.localPlayerId
                });
                
                // Wait a moment for server to process animation complete, then request ball respawn
                setTimeout(() => {
                    if (this.clientConnection) {
                        this.clientConnection.send({
                            type: 'requestBallRespawn',
                            isInitial: true
                        });
                    }
                }, 100); // Small delay to ensure proper order
            }
            this.startGameLoop(); // Start anyway
        }
    }

    private handlePaddleMove(msg: any): void {
        if (!this.player1 || !this.player2) return;
        
        const movingPlayer = msg.playerId === this.player1.getPlayerId() ? this.player1 : this.player2;
        
        // Only apply if the paddle belongs to the other player to avoid jitter
        if (movingPlayer.getPlayerId() !== this.localPlayerId) {
            movingPlayer.setZ(msg.positionZ || 0);
        }
    }

    private handleBallUpdate(msg: any): void {
        if (!this.ball || !msg.ballState) {
            console.warn('Ball not initialized or no ball state in message');
            return;
        }

        const ballState = msg.ballState;
        
        // Ensure ball is not visible if it's supposed to be "out of bounds"
        if (this.ball.ballBody) {
            if (ballState.position.y < -1 && !ballState.isRespawning) {
                this.ball.ballBody.isVisible = false;
            } else {
                this.ball.ballBody.isVisible = true;
            }
        }

        this.ball.setState(ballState);

        // For initial spawn, ensure ball is visible and starts its own animation
        if (msg.isInitialSpawn) {
            this.isGameStarted = true; // OFFICIALLY START THE GAME
            if (this.ball.ballBody) {
                this.ball.ballBody.isVisible = true;
                this.ball.ballBody.position.copyFrom(ballState.position);
            }
        } else if (msg.isScoreRespawn) {
            if (this.ball.ballBody) {
                this.ball.ballBody.isVisible = true;
                this.ball.ballBody.position.copyFrom(ballState.position);
            }
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
        
        // ⭐ FIX: Update UI scores with proper player names
        const currentPlayer = this.localPlayerId === this.player1.getPlayerId() ? this.player1 : this.player2;
        const opponent = this.localPlayerId === this.player1.getPlayerId() ? this.player2 : this.player1;
        const currentPlayerScore = msg.scores[currentPlayer.getPlayerId()] || 0;
        const opponentScore = msg.scores[opponent.getPlayerId()] || 0;
        
        updateScoresUIVersus(currentPlayerScore, opponentScore, currentPlayer.playerName, opponent.playerName);
    }

    private handleGameEnd(gameEndData: any): void {
        this.isGameOver = true;
        this.isGameLoopRunning = false;
        this.isGameStarted = false; // Reset for next game
        
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
            
            // 🎮 FIX: Use perspective-aware control mapping for FPS mode
            // In FPS mode, Player2 (left side, looking right) needs inverted controls
            const shouldInvert = cameraManager.shouldInvertControls();
            
            if (event.key === 'ArrowLeft') {
                // Determine the actual direction we'll send based on perspective
                const direction = shouldInvert ? 'down' : 'up';
                
                // Set the appropriate state based on actual direction being sent
                if (direction === 'up' && !this.isUpPressed) {
                    this.isUpPressed = true;
                    this.clientConnection.send({ type: 'keyDown', direction: 'up' });
                } else if (direction === 'down' && !this.isDownPressed) {
                    this.isDownPressed = true;
                    this.clientConnection.send({ type: 'keyDown', direction: 'down' });
                }
            } else if (event.key === 'ArrowRight') {
                // Determine the actual direction we'll send based on perspective
                const direction = shouldInvert ? 'up' : 'down';
                
                // Set the appropriate state based on actual direction being sent
                if (direction === 'up' && !this.isUpPressed) {
                    this.isUpPressed = true;
                    this.clientConnection.send({ type: 'keyDown', direction: 'up' });
                } else if (direction === 'down' && !this.isDownPressed) {
                    this.isDownPressed = true;
                    this.clientConnection.send({ type: 'keyDown', direction: 'down' });
                }
            }
        });

        document.addEventListener('keyup', (event) => {
            if (this.isGameOver || !this.clientConnection) return;
            
            // 🎮 FIX: Use perspective-aware control mapping for FPS mode
            const shouldInvert = cameraManager.shouldInvertControls();
            
            if (event.key === 'ArrowLeft') {
                // Determine the actual direction we were sending based on perspective
                const direction = shouldInvert ? 'down' : 'up';
                
                // Release the appropriate state based on actual direction that was being sent
                if (direction === 'up' && this.isUpPressed) {
                    this.isUpPressed = false;
                    this.clientConnection.send({ type: 'keyUp', direction: 'up' });
                } else if (direction === 'down' && this.isDownPressed) {
                    this.isDownPressed = false;
                    this.clientConnection.send({ type: 'keyUp', direction: 'down' });
                }
            } else if (event.key === 'ArrowRight') {
                // Determine the actual direction we were sending based on perspective
                const direction = shouldInvert ? 'up' : 'down';
                
                // Release the appropriate state based on actual direction that was being sent
                if (direction === 'up' && this.isUpPressed) {
                    this.isUpPressed = false;
                    this.clientConnection.send({ type: 'keyUp', direction: 'up' });
                } else if (direction === 'down' && this.isDownPressed) {
                    this.isDownPressed = false;
                    this.clientConnection.send({ type: 'keyUp', direction: 'down' });
                }
            }
        });

        (window as any).gameControlsInitialized = true;
    }

    private startGameLoop(): void {
        if (this.isGameLoopRunning || !this.map) return;

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

            // Update camera system (CRITICAL for FPS mode)
            cameraManager.update();

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
        
        if (this.isGameLoopRunning && this.map?.getEngine) {
            this.map.getEngine.stopRenderLoop();
            this.isGameLoopRunning = false;
        }

        if (this.clientConnection?.socket.readyState === WebSocket.OPEN) {
            this.clientConnection.socket.close();
        }

        // ⭐ CLEANUP: Properly dispose of map resources
        if (this.map) {
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