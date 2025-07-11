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
import { frontendAssetDisposalManager } from '../assetManagement/FrontendAssetDisposalManager.js';
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
    
    // ⭐ NEW: Track if tournament advancement has been received to prevent race conditions
    private tournamentAdvancementReceived: boolean = false;
    
    // Render loop management
    private renderLoopStopping: boolean = false;
    private renderLoopStopped: boolean = false;
    private renderLoopStopPromise: Promise<void> | null = null;
    constructor() {
        // Initialize the game client
    }

    // 🛑 NEW: Method to properly stop render loop with confirmation
    private async stopRenderLoop(): Promise<void> {
        if (this.renderLoopStopping || this.renderLoopStopped) {
            return this.renderLoopStopPromise || Promise.resolve();
        }

        this.renderLoopStopping = true;
        this.isGameLoopRunning = false;
        
        this.renderLoopStopPromise = new Promise<void>((resolve) => {
            if (this.map?.getEngine) {
                // Stop the render loop
                this.map.getEngine.stopRenderLoop();
                
                // Clear the canvas to remove the last frame
                this.clearCanvas();
                
                // Wait for the next frame to ensure the loop has stopped
                requestAnimationFrame(() => {
                    this.renderLoopStopped = true;
                    this.renderLoopStopping = false;
                    console.log('🛑 Render loop confirmed stopped and canvas cleared');
                    resolve();
                });
            } else {
                this.renderLoopStopped = true;
                this.renderLoopStopping = false;
                console.log('🛑 No engine to stop');
                resolve();
            }
        });

        return this.renderLoopStopPromise;
    }

    // 🛑 NEW: Method to clear the canvas
    private clearCanvas(): void {
        if (this.map?.canvas && this.map?.getEngine) {
            const canvas = this.map.canvas;
            const engine = this.map.getEngine;
            
            // Clear the WebGL canvas using BabylonJS engine
            engine.clear(new BABYLON.Color4(0, 0, 0, 1), true, true, true);
            console.log('🧹 WebGL canvas cleared');
        }
    }

    // 🛑 NEW: Method to check render loop status
    public getRenderLoopStatus(): {
        isGameLoopRunning: boolean;
        isGameOver: boolean;
        renderLoopStopping: boolean;
        renderLoopStopped: boolean;
        hasEngine: boolean;
    } {
        return {
            isGameLoopRunning: this.isGameLoopRunning,
            isGameOver: this.isGameOver,
            renderLoopStopping: this.renderLoopStopping,
            renderLoopStopped: this.renderLoopStopped,
            hasEngine: !!this.map?.getEngine
        };
    }

    // Initialize the game with a registered player ID
    public async initializeGame(playerId: string, isTournamentMode: boolean = false): Promise<void> {
        this.localPlayerId = playerId;
        
        // ⭐ NEW: Reset tournament advancement flag for new game
        this.tournamentAdvancementReceived = false;
        
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

        // ⭐ FIX: Only set up keyboard controls for non-tournament mode
        // Tournament mode keyboard controls are set up in setWebSocketConnection
        if (!isTournamentMode) {
            this.setupKeyboardControls();
        }
    }

    // Set WebSocket connection for tournament mode
    public setWebSocketConnection(connection: webSocketClient): void {
        this.clientConnection = connection;
        this.setupWebSocketHandlers();
        
        // ⭐ FIX: Set up keyboard controls after WebSocket connection is established
        // This ensures the keyboard handler can check for clientConnection properly
        this.setupKeyboardControls();
    }

    // Initialize tournament game with provided match data
    public async initializeTournamentGame(matchData: any): Promise<void> {
        console.log('🏆 initializeTournamentGame called with matchData:', matchData);
        
        // ⭐ CRITICAL FIX: Check if tournament advancement has been received to prevent race conditions
        if (this.tournamentAdvancementReceived) {
            console.log('🏆 Tournament advancement already received, skipping game initialization to prevent race condition');
            return;
        }
        
        console.log('🏆 Tournament game initialization starting...');
        
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
            console.log('🏆 Creating game map for tournament match...');
            try {
                this.map = new gameMap();
                this.map.createMap();
                this.map.createPlayground();
                console.log('🏆 Game map created successfully');
            } catch (mapError) {
                console.error('🏆 Error creating game map:', mapError);
                // ⭐ CRITICAL FIX: Retry map creation
                try {
                    console.log('🏆 Retrying game map creation...');
                    this.map = new gameMap();
                    this.map.createMap();
                    this.map.createPlayground();
                    console.log('🏆 Game map created successfully on retry');
                } catch (retryError) {
                    console.error('🏆 Failed to create game map on retry:', retryError);
                    throw new Error('Failed to create game map');
                }
            }
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

        // ⭐ CRITICAL FIX: Always dispose and recreate ball for clean state
        if (this.ball) {
            console.log('🏆 Disposing existing ball before creating new one for finals');
            this.ball.dispose();
            this.ball = null;
        }
        
        // Create fresh ball with proper initial state
        this.ball = new Ball(this.player1, this.player2);
        this.ball.createBall(this.map.getScene!);
        if (this.ball.ballBody) {
            this.ball.ballBody.metadata = { roomId: this.roomId };
            this.ball.ballBody.position.set(0, -2, 0);
            // ⭐ CRITICAL FIX: Ball should be invisible initially during animation
            this.ball.ballBody.isVisible = false; 
        }
        this.ball.position.set(0, -2, 0);
        this.ball.velocity.set(0, 0, 0); // ⭐ CRITICAL: Ensure velocity is zero
        this.ball.previousVelocity.set(0, 0, 0); // ⭐ CRITICAL: Ensure previous velocity is zero
        this.ball.isRespawning = true;
        this.ball.hasValidPosition = true;
        this.ball.isDisposed = false; // ⭐ CRITICAL: Reset disposal flag
        
        // ⭐ CRITICAL FIX: Reset all ball state to prevent any old state from persisting
        this.ball.rebounds = 0;
        this.ball.wasHitByPlayer = null;
        this.ball.speed = 0;
        this.ball.respawnTime = 0;
        this.ball.lastPosition = new BABYLON.Vector3(0, -2, 0);
        this.ball.lastUpdateTime = Date.now();
        
        console.log('🏆 Ball completely reset for finals match');

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

                // ⭐ CRITICAL FIX: Ensure animation always runs for finals matches
                console.log('🏆 Starting launchMatchAnimation for finals match...');
                this.isIntroAnimationRunning = true;
                
                // Add timeout protection for animation
                const animationPromise = this.map.launchMatchAnimation();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Animation timeout')), 10000); // 10 second timeout
                });
                
                await Promise.race([animationPromise, timeoutPromise]);
                this.isIntroAnimationRunning = false;
                console.log('🏆 launchMatchAnimation completed successfully');
                
                // CRITICAL: Switch to FPS perspective after animation
                cameraManager.switchToFPSAfterAnimation();
                
                // Re-enforce visibility after animation completes (but NOT the ball)
                if (this.player1?.paddleBody) {
                    this.player1.paddleBody.isVisible = true;
                }
                if (this.player2?.paddleBody) {
                    this.player2.paddleBody.isVisible = true;
                }
                // ⭐ CRITICAL FIX: Don't make ball visible here - let server control it through respawn
                // The ball should only become visible when the server actually spawns it
                
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
            } else {
                // ⭐ CRITICAL FIX: If map creation failed, create it and retry animation
                console.error('🏆 Map not available for finals match, creating it...');
                this.map = new gameMap();
                this.map.createMap();
                this.map.createPlayground();
                
                // Retry animation with new map
                console.log('🏆 Retrying launchMatchAnimation with newly created map...');
                this.isIntroAnimationRunning = true;
                await this.map.launchMatchAnimation();
                this.isIntroAnimationRunning = false;
                console.log('🏆 launchMatchAnimation completed with retry');
                
                // Send animation complete even if map was recreated
                if (this.clientConnection) {
                    this.clientConnection.send({
                        type: 'animationComplete',
                        playerId: this.localPlayerId
                    });
                    
                    setTimeout(() => {
                        if (this.clientConnection) {
                            this.clientConnection.send({
                                type: 'requestBallRespawn',
                                isInitial: true
                            });
                        }
                    }, 100);
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
            console.error('🏆 Error during tournament game initialization:', error);
            
            // ⭐ CRITICAL FIX: Ensure animation still runs even after error
            this.isIntroAnimationRunning = false;
            
            // Try to run animation even if there was an error
            try {
                if (this.map) {
                    console.log('🏆 Attempting to run launchMatchAnimation after error...');
                    this.isIntroAnimationRunning = true;
                    await this.map.launchMatchAnimation();
                    this.isIntroAnimationRunning = false;
                    console.log('🏆 launchMatchAnimation completed after error recovery');
                }
            } catch (animationError) {
                console.error('🏆 Failed to run animation after error recovery:', animationError);
                // Continue anyway - the game should still work
            }
            
            // Re-enforce visibility after error (but NOT the ball)
            if (this.player1?.paddleBody) {
                this.player1.paddleBody.isVisible = true;
            }
            if (this.player2?.paddleBody) {
                this.player2.paddleBody.isVisible = true;
            }
            // ⭐ CRITICAL FIX: Don't make ball visible here - let server control it through respawn
            // The ball should only become visible when the server actually spawns it
            
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

        this.clientConnection.socket.addEventListener('close', async () => {
            this.updateGameStatus('Connection closed');
            await this.cleanup();
        });

        // Set up game event handlers
        this.clientConnection.onInit(this.handleGameInit.bind(this));
        this.clientConnection.onPaddleMove(this.handlePaddleMove.bind(this));
        this.clientConnection.onBallUpdate(this.handleBallUpdate.bind(this));
        this.clientConnection.onSync(this.handleSync.bind(this));
        this.clientConnection.onScoreUpdate(this.handleScoreUpdate.bind(this));
        this.clientConnection.onGameEnd(async (gameEndData: any) => {
            await this.handleGameEnd(gameEndData);
        });

        // Handle waiting status and tournament advancement
        this.clientConnection.socket.addEventListener('message', async (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'waitingForPlayers') {
                    this.updateGameStatus(`Waiting for players... (${message.readyCount}/${message.totalNeeded} ready)`);
                    
                    // Handle waiting status and update player names
                    handleWaitingForPlayers(message, this.updateGameStatus.bind(this));
                } else if (message.type === 'tournamentAdvancement') {
                    // ⭐ CRITICAL FIX: Set flag to prevent race conditions with game initialization
                    this.tournamentAdvancementReceived = true;
                    
                    await TournamentClientHandler.handleTournamentAdvancement(message, this.updateGameStatus.bind(this), {
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
                        if (this.isGameLoopRunning && this.map?.getEngine) {
                            this.map.getEngine.stopRenderLoop();
                            this.isGameLoopRunning = false;
                        }
                        this.isGameOver = false;
                        
                        // ⭐ CRITICAL FIX: Ensure ball is properly disposed before nullifying
                        if (this.ball) {
                            console.log('🏆 Disposing ball during tournament advancement');
                            this.ball.dispose();
                        }
                        
                        this.map = null;
                        this.ball = null;
                        this.player1 = null;
                        this.player2 = null;
                        
                        // Update game status with the message from server
                        if (message.message) {
                            this.updateGameStatus(message.message);
                        }
                    } else if (message.status === 'final_match_complete') {
                        // Individual final match is complete
                        this.isGameOver = true;
                        this.isGameLoopRunning = false;
                        
                        // The splash screen is now handled by TournamentClientHandler
                        // No need to update game status here as the splash screen will be shown
                    } else if (message.status === 'tournament_complete') {
                        // Tournament is complete (both finals finished)
                        this.isGameOver = true;
                        this.isGameLoopRunning = false;
                        
                        // The splash screen should already be shown from the individual final match completion
                        // Just update the status if needed
                        if (message.message) {
                            this.updateGameStatus(message.message);
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
                    console.log('🏆 Received gameInit message:', message);
                    // Handle game initialization for tournament matches
                    TournamentClientHandler.handleGameInit(message, this.updateGameStatus.bind(this), this);
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });
    }

    private async handleGameInit(data: any): Promise<void> {
        console.log('🎮 Tournament: Game init received:', data);
        
        const { 
            player1Name, player2Name, playerName, opponentName, 
            playerPositionZ, opponentPositionZ, roomId: serverRoomId 
        } = data;

        this.roomId = serverRoomId;
        
        // ⭐ FIX: Initialize game state - input will be enabled after animationComplete
        this.isGameStarted = false;
        this.isIntroAnimationRunning = true;
        
        // Update UI with player names and scores
        this.updateScores(0, 0);

        // ⭐ FIX: Create paddles with server-provided initial positions
        try {
            if (!this.map?.getScene) {
                console.error('Map or scene not available for paddle creation');
                return;
            }
            
            if (!this.player1 || !this.player2) {
                console.error('Players not initialized for paddle creation');
                return;
            }
            
            this.player1.createPaddle(this.map.getScene, 19.5, 2, 20);
            this.player2.createPaddle(this.map.getScene, -19.5, 2, 20);
            
            // Use server-provided initial positions to ensure synchronization
            const player1PositionZ = playerPositionZ || 0;
            const player2PositionZ = opponentPositionZ || 0;
            
            // Set paddle positions based on server data
            this.player1.setZ(player1PositionZ);
            this.player2.setZ(player2PositionZ);
            
            console.log(`🎮 Tournament: Set initial paddle positions: player1=${player1PositionZ}, player2=${player2PositionZ}`);
        } catch (e) {
            console.error('Tournament paddle creation failed:', e);
            return;
        }

        // ⭐ TOURNAMENT FIX: Reset scores display when game initializes
        this.updateScores(0, 0);

        // Create fresh ball (important for tournament final matches)
        if (!this.ball && this.player1 && this.player2) {
            this.ball = new Ball(this.player1, this.player2);
            if (this.map?.getScene) {
                this.ball.createBall(this.map.getScene);
                if (this.ball.ballBody) {
                    this.ball.ballBody.metadata = { roomId: this.roomId };
                    this.ball.ballBody.position.set(0, -2, 0);
                    this.ball.ballBody.isVisible = true; 
                }
                this.ball.position.set(0, -2, 0);
                this.ball.isRespawning = true;
                this.ball.hasValidPosition = true;
            }
        }

        // ⭐ TOURNAMENT FIX: Ensure all game elements are visible for new game
        TournamentClientHandler.ensureTournamentElementsVisible({
            ball: null,
            player1: this.player1,
            player2: this.player2
        });

        // Start the game loop after match animation
        if (!this.isGameLoopRunning) {
            try {
                await this.map.launchMatchAnimation();
                
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

                cameraManager.switchToFPSAfterAnimation();
                
                // ⭐ CRITICAL: Send animationComplete to server
                if (this.clientConnection) {
                    this.clientConnection.send({
                        type: 'animationComplete',
                        playerId: this.localPlayerId
                    });
                }
                
                // ⭐ FIX: Animation is complete, but game is not started yet
                // The server will enable input when both players complete animation
                this.isIntroAnimationRunning = false;
                console.log('🎮 Tournament: Animation complete, waiting for server to start game');
                
                this.startGameLoop();
            } catch (e) {
                console.error('Error during tournament game initialization:', e);
                
                // Ensure elements are visible even if animation fails
                if (this.player1?.paddleBody) {
                    this.player1.paddleBody.isVisible = true;
                }
                if (this.player2?.paddleBody) {
                    this.player2.paddleBody.isVisible = true;
                }
                if (this.ball?.ballBody) {
                    this.ball.ballBody.isVisible = true;
                }
                
                // Still send animationComplete even if animation failed
                if (this.clientConnection) {
                    this.clientConnection.send({
                        type: 'animationComplete',
                        playerId: this.localPlayerId
                    });
                }
                
                this.isIntroAnimationRunning = false;
                this.startGameLoop();
            }
        }
    }

    private handlePaddleMove(msg: any): void {
        if (!this.player1 || !this.player2) return;
        
        const movingPlayer = msg.playerId === this.player1.getPlayerId() ? this.player1 : this.player2;
        
        // ✅ FIX: Sync BOTH local and opponent paddle positions
        // This ensures the camera follows the server-authoritative paddle position
        movingPlayer.setZ(msg.positionZ || 0);
        
        // Debug logging to track sync
        if (movingPlayer.getPlayerId() === this.localPlayerId) {
            console.log(`🎮 Tournament: Sync message updated local player paddle to: ${msg.positionZ}`);
        }
    }

    private handleBallUpdate(msg: any): void {
        if (!this.ball || !msg.ballState) {
            console.warn('Ball not initialized or no ball state in message');
            return;
        }

        // ⭐ CRITICAL FIX: Prevent ball state processing if ball has been disposed
        if (this.ball.isDisposed) {
            console.warn('Ball has been disposed, ignoring ball update');
            return;
        }

        // ⭐ CRITICAL FIX: Prevent ball state processing during animation phase
        if (this.isIntroAnimationRunning) {
            console.warn('Animation is running, ignoring ball update to prevent state corruption');
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
                // ✅ FIX: Sync BOTH local and opponent paddle positions
                // This ensures consistent synchronization between server and client
                if (syncPlayer) {
                    syncPlayer.setZ(positionZ);
                    
                    // Debug logging for local player sync
                    if (syncPlayer.getPlayerId() === this.localPlayerId) {
                        console.log(`🎮 Tournament: Sync message updated local player paddle to: ${positionZ}`);
                    }
                }
            });
        }

        // ⭐ CRITICAL FIX: Handle ball disposal flag from server
        if (msg.ballDisposed && this.ball) {
            console.log('🏆 Received ball disposal flag from server, disposing ball immediately');
            this.ball.dispose();
            this.ball = null;
            return;
        }

        // ⭐ CRITICAL FIX: Prevent ball state processing if ball has been disposed
        if (msg.ballState && this.ball && !this.ball.isDisposed) {
            // ⭐ CRITICAL FIX: Prevent ball state processing during animation phase
            if (this.isIntroAnimationRunning) {
                console.warn('Animation is running, ignoring ball state in sync to prevent state corruption');
                return;
            }
            
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

    private async handleGameEnd(gameEndData: any): Promise<void> {
        console.log('🎮 Game end detected, stopping render loop...');
        
        // 🛑 NEW: Stop render loop first and wait for confirmation
        await this.stopRenderLoop();
        
        this.isGameOver = true;
        this.isGameStarted = false; // Reset for next game
        
        console.log('Game Over!', gameEndData);
        
        const isWinner = gameEndData.winner.id === this.localPlayerId;
        const resultText = isWinner 
            ? `🎉 YOU WON! Final Score: ${gameEndData.winner.score}-${gameEndData.loser.score}`
            : `😔 You Lost. Final Score: ${gameEndData.winner.score}-${gameEndData.loser.score}`;
        
        this.updateGameStatus(resultText);

        // 🛑 NEW: Only dispose assets after render loop is confirmed stopped
        if (gameEndData.isTournamentMatch) {
            try {
                await frontendAssetDisposalManager.disposeBetweenMatches({
                    ball: this.ball,
                    player1: this.player1,
                    player2: this.player2,
                    map: this.map,
                    scene: this.map?.getScene
                });
                console.log('🧹 Frontend: Assets disposed after tournament match (render loop stopped)');
            } catch (error) {
                console.error('🧹 Frontend: Error disposing assets after match:', error);
            }
        }
    }

    private setupKeyboardControls(): void {
        // ⭐ FIX: Prevent multiple keyboard handler initialization
        if ((window as any).gameControlsInitialized) {
            console.log('⌨️ Keyboard controls already initialized, skipping');
            return;
        }

        // ⭐ FIX: Create a single, unified keyboard handler for all game modes
        const keydownHandler = (event: KeyboardEvent) => {
            // ⭐ CRITICAL: Only process input when game is actually playing
            if (this.isGameOver || !this.clientConnection) {
                console.log('⌨️ Input blocked: game not ready for input', {
                    isGameOver: this.isGameOver,
                    hasConnection: !!this.clientConnection,
                    isIntroAnimationRunning: this.isIntroAnimationRunning,
                    isGameStarted: this.isGameStarted
                });
                return;
            }
            
            // ⭐ NEW: Add debug logging for successful input
            console.log('⌨️ Processing keydown:', event.key, {
                isGameOver: this.isGameOver,
                hasConnection: !!this.clientConnection,
                isIntroAnimationRunning: this.isIntroAnimationRunning,
                isGameStarted: this.isGameStarted
            });
            
            // 🎮 FIX: Use perspective-aware control mapping for FPS mode
            const shouldInvert = cameraManager.shouldInvertControls();
            
            if (event.key === 'ArrowLeft') {
                const direction = shouldInvert ? 'down' : 'up';
                
                if (direction === 'up' && !this.isUpPressed) {
                    this.isUpPressed = true;
                    this.clientConnection.send({ type: 'keyDown', direction: 'up' });
                    console.log('⌨️ Sent keyDown up');
                } else if (direction === 'down' && !this.isDownPressed) {
                    this.isDownPressed = true;
                    this.clientConnection.send({ type: 'keyDown', direction: 'down' });
                    console.log('⌨️ Sent keyDown down');
                }
            } else if (event.key === 'ArrowRight') {
                const direction = shouldInvert ? 'up' : 'down';
                
                if (direction === 'up' && !this.isUpPressed) {
                    this.isUpPressed = true;
                    this.clientConnection.send({ type: 'keyDown', direction: 'up' });
                    console.log('⌨️ Sent keyDown up');
                } else if (direction === 'down' && !this.isDownPressed) {
                    this.isDownPressed = true;
                    this.clientConnection.send({ type: 'keyDown', direction: 'down' });
                    console.log('⌨️ Sent keyDown down');
                }
            } else if (event.key === 'A' || event.key === 'a') {
                // ⭐ POWERUP: Activate power-up when A key is pressed
                console.log('⌨️ Tournament: Power-up activation requested');
                this.clientConnection.activatePowerup();
            }
        };

        const keyupHandler = (event: KeyboardEvent) => {
            // ⭐ CRITICAL: Only process input when game is actually playing
            if (this.isGameOver || !this.clientConnection) {
                return;
            }
            
            const shouldInvert = cameraManager.shouldInvertControls();
            
            if (event.key === 'ArrowLeft') {
                const direction = shouldInvert ? 'down' : 'up';
                
                if (direction === 'up' && this.isUpPressed) {
                    this.isUpPressed = false;
                    this.clientConnection.send({ type: 'keyUp', direction: 'up' });
                } else if (direction === 'down' && this.isDownPressed) {
                    this.isDownPressed = false;
                    this.clientConnection.send({ type: 'keyUp', direction: 'down' });
                }
            } else if (event.key === 'ArrowRight') {
                const direction = shouldInvert ? 'up' : 'down';
                
                if (direction === 'up' && this.isUpPressed) {
                    this.isUpPressed = false;
                    this.clientConnection.send({ type: 'keyUp', direction: 'up' });
                } else if (direction === 'down' && this.isDownPressed) {
                    this.isDownPressed = false;
                    this.clientConnection.send({ type: 'keyUp', direction: 'down' });
                }
            }
        };

        // ⭐ FIX: Store handlers globally for proper cleanup
        (window as any).gameKeydownHandler = keydownHandler;
        (window as any).gameKeyupHandler = keyupHandler;
        (window as any).gameControlsInitialized = true;

        document.addEventListener('keydown', keydownHandler);
        document.addEventListener('keyup', keyupHandler);
        
        console.log('⌨️ Unified keyboard controls initialized');
        
        // ⭐ NEW: Test keyboard event listener attachment
        console.log('⌨️ Testing keyboard event listener attachment...');
        const testEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        document.dispatchEvent(testEvent);
    }

    private startGameLoop(): void {
        if (this.isGameLoopRunning || !this.map || this.renderLoopStopping) return;

        this.isGameLoopRunning = true;
        this.renderLoopStopped = false; // Reset stopped state

        const renderLoop = () => {
            // 🛑 NEW: Check all stopping conditions
            if (this.isGameOver || !this.map || this.renderLoopStopping) {
                if (this.map?.getEngine && !this.renderLoopStopping) {
                    this.map.getEngine.stopRenderLoop();
                }
                this.isGameLoopRunning = false;
                return;
            }

            const deltaTime = this.map.getEngine!.getDeltaTime() / 1000;
            
            // Handle local player movement (client-side visual update only)
            // ✅ FIX: Tournament mode now uses keyDown/keyUp messages (like 1v1)
            // The server handles movement calculation based on key states
            const localPlayer = this.player1?.getPlayerId() === this.localPlayerId ? this.player1 : this.player2;

            if (localPlayer) {
                if (this.isUpPressed && !this.isDownPressed) {
                    localPlayer.move(-1, deltaTime);
                } else if (this.isDownPressed && !this.isUpPressed) {
                    localPlayer.move(1, deltaTime);
                }
                // ✅ REMOVED: No more paddlePosition messages - keyboard controls handle input
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

    public async cleanup(): Promise<void> {
        console.log('🧹 Starting game client cleanup...');
        
        // ⭐ NEW: Reset tournament advancement flag
        this.tournamentAdvancementReceived = false;
        
        // ⭐ FIX: Clean up keyboard event listeners
        if ((window as any).gameKeydownHandler) {
            document.removeEventListener('keydown', (window as any).gameKeydownHandler);
            delete (window as any).gameKeydownHandler;
            console.log('⌨️ Tournament: Keydown event listener removed');
        }
        
        if ((window as any).gameKeyupHandler) {
            document.removeEventListener('keyup', (window as any).gameKeyupHandler);
            delete (window as any).gameKeyupHandler;
            console.log('⌨️ Tournament: Keyup event listener removed');
        }
        
        // Reset game control flags
        (window as any).gameControlsInitialized = false;
        
        // 🛑 NEW: Use proper render loop stopping
        await this.stopRenderLoop();

        if (this.clientConnection?.socket.readyState === WebSocket.OPEN) {
            this.clientConnection.socket.close();
        }

        // Dispose all game assets
        try {
            await frontendAssetDisposalManager.disposeAtTournamentEnd({
                ball: this.ball,
                player1: this.player1,
                player2: this.player2,
                map: this.map,
                scene: this.map?.getScene
            });
            console.log('🧹 Frontend: Assets disposed during cleanup (render loop stopped)');
        } catch (error) {
            console.error('🧹 Frontend: Error disposing assets during cleanup:', error);
        }

        this.clientConnection = null;
        this.player1 = null;
        this.player2 = null;
        this.ball = null;
        this.map = null;
        this.roomId = null;
        this.localPlayerId = null;
        this.isGameOver = false;
        this.isGameStarted = false;
        this.renderLoopStopped = false;
        this.renderLoopStopPromise = null;
    }

    public async leaveGame(): Promise<void> {
        console.log('🚪 Leaving game, stopping render loop...');
        
        // Set game as over to stop input and rendering
        this.isGameOver = true;
        
        // 🛑 NEW: Use proper render loop stopping
        await this.stopRenderLoop();

        // Send leave game message to server
        if (this.clientConnection) {
            this.clientConnection.leaveGame();
        }

        // Force dispose all assets
        try {
            await frontendAssetDisposalManager.forceDisposal({
                ball: this.ball,
                player1: this.player1,
                player2: this.player2,
                map: this.map,
                scene: this.map?.getScene
            });
            console.log('🧹 Frontend: Assets force disposed during leave game (render loop stopped)');
        } catch (error) {
            console.error('🧹 Frontend: Error force disposing assets during leave game:', error);
        }

        // Clean up remaining resources
        this.player1 = null;
        this.player2 = null;
        this.ball = null;
        this.map = null;
        this.roomId = null;
        this.localPlayerId = null;
        this.renderLoopStopped = false;
        this.renderLoopStopPromise = null;
    }
} 