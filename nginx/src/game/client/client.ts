import { playerPaddle } from '../player/player.js';
import { gameMap } from '../map/gameMap.js';
import { webSocketClient } from '../webSocketClient/webSocketClient.js';
import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import { fetchWithSelfSigned } from '../utils/fetch.js';
import { updatePlayerNames, updateScoresUI, updateScoresUIVersus, updatePlayerNamesVersus, updateGameStatus } from '../playerUi/playerUi.js';
import { handleWaitingForPlayers } from '../ui/waitingStatusHandler.js';
import { soundManager } from '../audio/soundManager.js';
import { TournamentClientHandler } from '../tournament/tournamentClientHandler.js';
import { showSplashScreen } from '../ui/splashScreen.js';
import { showGameEndSplashScreen, GameEndData } from '../utils/splashScreenUtils.js';

interface PlayerData {
    id: string;
    readyToPlay: boolean;
    [key: string]: any;
}

interface ApiResponse {
    data: PlayerData[];
}



const serverPort = 8081; // Game service port (WebSocket and API)
let clientConnection: webSocketClient | null = null;
let map: gameMap | null = null;
let player1: playerPaddle | null = null;
let player2: playerPaddle | null = null;
let ball: Ball | null = null;
let roomId: string | null = null;
let localPlayerId: string | null = null;
let isUpPressed: boolean = false;
let isDownPressed: boolean = false;
let lastBallPosition: BABYLON.Vector3 | null = null;
let lastSyncTime: number | null = null;
let predictedPosition: BABYLON.Vector3 | null = null;
let ping: number = 0;
let pingSamples: number[] = [];
let isGameOver: boolean = false;
let matchEndTime: Date | null = null;
let initTime: number | null = null;
let syncCount: number = 0;
let ballUpdateReceived: boolean = false;
let isGameLoopRunning: boolean = false;

// Function to handle sound events
function handleSoundEvent(msg: any): void {
    const { sound, ballSpeed, rebounds } = msg;
    
    switch (sound) {
        case 'paddleHit':
            // Vary volume based on ball speed for more immersion
            const volumeMultiplier = Math.min(1, (ballSpeed || 25) / 50);
            soundManager.playSound('paddleHit', volumeMultiplier);
            break;
            
        case 'wallHit':
            soundManager.playSound('wallHit', 0.7);
            break;
            
        case 'lostPoint':
            soundManager.playSound('lostPoint', 1.0);
            break;
            
        default:
            console.warn('Unknown sound event:', sound);
    }
}



// Function to check available players
async function checkAvailablePlayers(): Promise<PlayerData[]> {
    try {
        //TODO: USE SIGNED OF JO
        const response = await fetchWithSelfSigned(`http://localhost:8081/api/players`, {
            method: 'GET',
        });
        
        const result: ApiResponse = await response.json();
        if (!result.data || !Array.isArray(result.data)) {
            throw new Error('Invalid response format from server');
        }
        
        return result.data;
    } catch (error) {
        console.error('Error checking players:', error);
        throw error;
    }
}

// Function to set player ready status
async function setPlayerReady(playerId: string): Promise<boolean> {
    try {
        //TODO: USE SIGNED OF JO
        const response = await fetchWithSelfSigned(`http://localhost:8081/api/players/${playerId}/ready`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),  // Send empty object as body
        });
        
        if (!response.ok) {
            throw new Error('Failed to set player ready status');
        }
        
        return true;
    } catch (error) {
        console.error('Error setting player ready:', error);
        throw error;
    }
}

// Function to initialize the game
export function initializeGame(playerId: string): void {
    if (clientConnection) {
        clientConnection.socket.close();
    }
    isGameOver = false;
    isGameLoopRunning = false;
    localPlayerId = playerId;
    // Use ws:// for HTTP since game service HTTP server is on port 8081 (which includes WebSocket)
    clientConnection = new webSocketClient(`ws://localhost:8081/ws`, playerId);
    
    // Make leaveGame function available globally for Leave Game button
    (window as any).leaveGame = leaveGame;

    clientConnection.socket.addEventListener('open', () => {
        updateGameStatus('Connected to game server');
    });

    clientConnection.socket.addEventListener('error', err => {
        console.error('WebSocket error:', err);
        updateGameStatus('Connection error');
    });

    clientConnection.socket.addEventListener('close', () => {
        updateGameStatus('Connection closed');
        // Clean up game loop if it's running
        if (isGameLoopRunning && map && map.getEngine) {
            map.getEngine.stopRenderLoop();
            isGameLoopRunning = false;
        }
    });

    // Set up paddle movement handler
    clientConnection.onPaddleMove((msg) => {
        if (!player1 || !player2) return;
        const movingPlayer = msg.playerId === player1.getPlayerId() ? player1 : player2;
        if (movingPlayer) {
            // Always update paddle position from server (for HTTP commands and sync)
            movingPlayer.setZ(msg.positionZ || 0);
        }
    });

    // 🔊 Set up sound event handler
    clientConnection.onSoundEvent((msg) => {
        handleSoundEvent(msg);
    });

    // Add ball update handler
    clientConnection.onBallUpdate((msg) => {
        if (!ball) return;
        if (msg.ballState?.isRespawning || msg.isInitialSpawn || msg.isScoreRespawn) {
            if (ball.ballBody) {
                ball.ballBody.isVisible = true;
            }
        }
        if (msg.ballState) {
            ball.setState(msg.ballState);
        }
    });

    // Add sync handler to ensure positions are correct
    clientConnection.onSync((msg) => {
        if (!player1 || !player2) return;
        if (msg.playerPositions) {
            Object.entries(msg.playerPositions).forEach(([playerId, positionZ]) => {
                const syncPlayer = playerId === player1!.getPlayerId() ? player1 : player2;
                if (syncPlayer) {
                    // Always sync paddle positions from server (important for HTTP commands)
                    syncPlayer.setZ(positionZ);
                }
            });
        }
        if (msg.ballState && ball) {
            ball.setState(msg.ballState);
        }
    });

    // Add score update handler with camera shake for losing player
    let previousScores: { [key: string]: number } = {};
    clientConnection.onScoreUpdate((msg) => {
        if (!player1 || !player2 || !map || !msg.scores) return;
        const currentScores = msg.scores;
        if (Object.keys(previousScores).length === 0) {
            Object.keys(currentScores).forEach(playerId => {
                previousScores[playerId] = 0;
            });
        }
        let losingPlayerId: string | null = null;
        
        for (const [playerId, currentScore] of Object.entries(currentScores)) {
            const previousScore = previousScores[playerId] || 0;
            if (currentScore > previousScore) {
                const otherPlayerId = Object.keys(currentScores).find(id => id !== playerId);
                losingPlayerId = otherPlayerId || null;
                break;
            }
        }
        
        if (losingPlayerId === localPlayerId) {
            map.triggerCameraShake().catch(error => {
                console.error('Camera shake failed:', error);
            });
        }
        previousScores = { ...currentScores };
        
        if (player1 && player2) {
            const player1Score = currentScores[player1.getPlayerId()] || 0;
            const player2Score = currentScores[player2.getPlayerId()] || 0;
            player1.playerScore = player1Score;
            player2.playerScore = player2Score;
            
            // Update UI with scores and player names from current player's perspective
            const currentPlayer = localPlayerId === player1.getPlayerId() ? player1 : player2;
            const opponent = localPlayerId === player1.getPlayerId() ? player2 : player1;
            const currentPlayerScore = currentScores[currentPlayer.getPlayerId()] || 0;
            const opponentScore = currentScores[opponent.getPlayerId()] || 0;
            
            updateScoresUIVersus(currentPlayerScore, opponentScore, currentPlayer.playerName, opponent.playerName);
            

        }
    });

    // Add game end handler
    clientConnection.onGameEnd((msg: any) => {
        const gameEndData = msg as GameEndData;
        isGameOver = true;
        

        
        // Stop the game loop and clean up
        if (isGameLoopRunning && map?.getEngine) {
            map.getEngine.stopRenderLoop();
            isGameLoopRunning = false;
        }
        
        // Show win/loss splash screen with sound BEFORE cleanup (while localPlayerId is still valid)
        showGameEndSplashScreen(gameEndData, localPlayerId);
        
        // Clean up resources AFTER showing splash screen
        cleanup();
    });

    // Add handler for waiting status and tournament advancement
    clientConnection.socket.addEventListener('message', (event: MessageEvent) => {
        try {
            const message = JSON.parse(event.data);
            if (message.type === 'waitingForPlayers') {
                handleWaitingForPlayers(message, updateGameStatus);
            } else if (message.type === 'tournamentAdvancement') {

                updateGameStatus(message.message || 'Tournament advancement...');
                
                // Use TournamentClientHandler for proper advancement handling
                TournamentClientHandler.handleTournamentAdvancement(
                    message,
                    updateGameStatus,
                    {
                        isGameOver,
                        isGameLoopRunning,
                        map,
                        ball,
                        player1,
                        player2
                    }
                );
                
                // Reset game state for finals
                if (message.status === 'transferred_to_final') {
                    // ⭐ CRITICAL: Reset all game state for final match
                    isGameOver = false; // Allow new game to start
                    isGameLoopRunning = false;
                    ballUpdateReceived = false;
                    syncCount = 0;
                    lastBallPosition = null;
                    lastSyncTime = null;
                    predictedPosition = null;
                    
                    // Clear object references (TournamentClientHandler already disposed/nulled them)
                    map = null;
                    ball = null;
                    player1 = null;
                    player2 = null;
                    

                }
            } else if (message.type === 'hideGameElements') {
                // Handle semi-final completion element hiding
                TournamentClientHandler.handleHideGameElements(
                    message,
                    updateGameStatus,
                    { ball, player1, player2 }
                );
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    clientConnection.onInit(async ({ playerId, roomId: rId, role, opponentId, playerName, opponentName }) => {

        initTime = Date.now();
        roomId = rId || null;
        localPlayerId = playerId || null;

        // ⭐ TOURNAMENT FIX: Reset game state for clean start (important for finals)
        TournamentClientHandler.resetTournamentGameState({
            isGameOver,
            isGameLoopRunning
        });
        isGameOver = false;
        isGameLoopRunning = false;

        // Store player names for UI updates
        let player1Name, player2Name;
        if (role === 0) {
            player1Name = playerName || 'Player 1';
            player2Name = opponentName || 'Player 2';
        } else {
            player1Name = opponentName || 'Player 1';
            player2Name = playerName || 'Player 2';
        }

        // Get player names for splash screen (from current player's perspective)
        const currentPlayerName = playerName || 'You';
        const opponentDisplayName = opponentName || 'Opponent';
        
        // Show splash screen BEFORE creating any game elements
        updateGameStatus('Preparing match...');
        
        try {
            // Show splash screen for 3 seconds
            await showSplashScreen(currentPlayerName, opponentDisplayName, 3000);
        } catch (error) {
            console.error('Error showing splash screen:', error);
            // Continue with game initialization even if splash screen fails
        }
        
        // NOW create the game elements AFTER splash screen

        // Create new map (should always be fresh for tournament games)
        if (!map) {
            try {
                map = new gameMap();
                map.createMap();
                map.createPlayground();
                if (!map.getScene) {
                    throw new Error('map.getScene is undefined');
                }
            } catch (e) {
                console.error('Map creation failed:', e);
                updateGameStatus('Error: Failed to create game map');
                return;
            }
        }

        // Create fresh paddles (important for tournament final matches)
        if (!player1 || !player2) {
            if (!playerId || !opponentId) {
                console.error('Missing player IDs');
                return;
            }
            
            if (role === 0) {
                player1 = new playerPaddle(player1Name, playerId, 0);
                player2 = new playerPaddle(player2Name, opponentId, 1);
            } else {
                player1 = new playerPaddle(player1Name, opponentId, 0);
                player2 = new playerPaddle(player2Name, playerId, 1);
            }

            try {
                player1.createPaddle(map.getScene!, 19.5, 2, 20);
                player2.createPaddle(map.getScene!, -19.5, 2, 20);
                
                // ⭐ TOURNAMENT FIX: Reset paddle positions for tournament games
                TournamentClientHandler.resetTournamentPaddlePositions(player1, player2);
            } catch (e) {
                console.error('Paddle creation failed:', e);
                return;
            }
        }

        // Create fresh ball (important for tournament final matches)
        if (!ball) {
            try {
                ball = new Ball(player1, player2);
                ball.createBall(map.getScene!);
                if (ball.ballBody) {
                    ball.ballBody.metadata = { roomId };
                    // ⭐ CRITICAL FIX: Position ball at center (y=0) instead of y=-2 for visibility
                    ball.ballBody.position = new BABYLON.Vector3(0, 0, 0);
                    ball.ballBody.isVisible = true;
                }
                // ⭐ CRITICAL FIX: Set ball position to center for tournament finals
                ball.position = new BABYLON.Vector3(0, 0, 0);
                ball.isRespawning = true;
                ball.respawnTime = 0;
                ball.hasValidPosition = true;
                
                // Request initial ball respawn from server
                clientConnection!.send({
                    type: 'requestBallRespawn',
                    isInitial: true
                });
                console.log('Requested initial ball respawn');
            } catch (e) {
                console.error('Ball creation failed:', e);
                return;
            }
        }

        // ⭐ TOURNAMENT FIX: Ensure all elements are visible for new game
        TournamentClientHandler.ensureTournamentElementsVisible({
            ball,
            player1,
            player2
        });

        // ⭐ CRITICAL FIX: Double-check paddle visibility before animation
        if (player1?.paddleBody) {
            player1.paddleBody.isVisible = true;
            console.log('✅ Player1 paddle made visible before animation');
        }
        if (player2?.paddleBody) {
            player2.paddleBody.isVisible = true;
            console.log('✅ Player2 paddle made visible before animation');
        }
        if (ball?.ballBody) {
            ball.ballBody.isVisible = true;
            console.log('✅ Ball made visible before animation');
        }

        updateGameStatus('Game starting...');
        
        // 🔊 Initialize sound manager
        soundManager.preloadSounds().catch(error => {
            console.warn('Failed to initialize sound manager:', error);
        });
        
        // ⭐ TOURNAMENT FIX: Reset scores for clean start
        updateScoresUIVersus(0, 0, player1Name, player2Name);
        
        // Update player names in UI from current player's perspective
        updatePlayerNamesVersus(playerName || 'Player', opponentName || 'Opponent');
        
        // Set up keyboard controls if not already set
        if (!(window as any).gameControlsInitialized) {
            // **CRITICAL FIX**: Store event handler references for proper cleanup
            const keydownHandler = (event: KeyboardEvent) => {
                if (isGameOver) return;
                if (event.key === 'ArrowUp' && !isUpPressed) {
                    isUpPressed = true;
                    clientConnection!.send({ type: 'keyDown', direction: 'up' });
                } else if (event.key === 'ArrowDown' && !isDownPressed) {
                    isDownPressed = true;
                    clientConnection!.send({ type: 'keyDown', direction: 'down' });
                }
            };

            const keyupHandler = (event: KeyboardEvent) => {
                if (isGameOver) return;
                if (event.key === 'ArrowUp' && isUpPressed) {
                    isUpPressed = false;
                    clientConnection!.send({ type: 'keyUp', direction: 'up' });
                } else if (event.key === 'ArrowDown' && isDownPressed) {
                    isDownPressed = false;
                    clientConnection!.send({ type: 'keyUp', direction: 'down' });
                }
            };

            document.addEventListener('keydown', keydownHandler);
            document.addEventListener('keyup', keyupHandler);
            
            // **CRITICAL**: Store handlers globally for cleanup
            (window as any).gameKeydownHandler = keydownHandler;
            (window as any).gameKeyupHandler = keyupHandler;
            (window as any).gameControlsInitialized = true;

        }
        
        // Start the game loop after match animation if not already running
        if (!isGameLoopRunning) {
            try {
                console.log('🎬 Starting match animation with visible elements...');
                await map.launchMatchAnimation();
                console.log('🎬 Match animation completed');
                
                // ⭐ CRITICAL FIX: Re-enforce visibility after animation completes
                if (player1?.paddleBody) {
                    player1.paddleBody.isVisible = true;
                    console.log('✅ Player1 paddle re-enforced visible after animation');
                }
                if (player2?.paddleBody) {
                    player2.paddleBody.isVisible = true;
                    console.log('✅ Player2 paddle re-enforced visible after animation');
                }
                if (ball?.ballBody) {
                    ball.ballBody.isVisible = true;
                    // ⭐ CRITICAL FIX: Ensure ball is positioned for visibility
                    if (ball.ballBody.position.y < -1) {
                        ball.ballBody.position.y = 0;
                        ball.position.y = 0;
                    }
                    console.log('✅ Ball re-enforced visible after animation at position:', ball.ballBody.position);
                }
                
                // Notify server that animation is complete
                if (clientConnection) {
                    clientConnection.send({
                        type: 'animationComplete',
                        playerId: localPlayerId
                    });
                    console.log('Sent animationComplete to server');
                }
                
                setupGameLoop();
            } catch (e) {
                console.error('Error during game initialization:', e);
                
                // ⭐ CRITICAL FIX: Even on error, ensure elements are visible
                if (player1?.paddleBody) {
                    player1.paddleBody.isVisible = true;
                }
                if (player2?.paddleBody) {
                    player2.paddleBody.isVisible = true;
                }
                if (ball?.ballBody) {
                    ball.ballBody.isVisible = true;
                    // ⭐ CRITICAL FIX: Ensure ball is positioned for visibility even on error
                    if (ball.ballBody.position.y < -1) {
                        ball.ballBody.position.y = 0;
                        ball.position.y = 0;
                    }
                }
                
                // Send animation complete anyway to prevent server hanging
                if (clientConnection) {
                    clientConnection.send({
                        type: 'animationComplete',
                        playerId: localPlayerId
                    });
                    console.log('Sent animationComplete to server (after error)');
                }
                // Start game loop anyway if animation fails
                setupGameLoop();
            }
        }
    });
}

// Export cleanup function for Leave Game button
export function cleanup(): void {
    // Set game as over to immediately stop input and rendering
    isGameOver = true;
    
    if (isGameLoopRunning && map?.getEngine) {
        map.getEngine.stopRenderLoop();
        isGameLoopRunning = false;
    }

    if (clientConnection?.socket?.readyState === WebSocket.OPEN) {
        clientConnection.socket.close();
    }

    // Clean up join game button handler
    if ((window as any).joinGameButtonHandler && (window as any).joinGameButtonSetup) {
        const joinGameBtn = document.getElementById('joinGameBtn') as HTMLButtonElement;
        if (joinGameBtn) {
            joinGameBtn.removeEventListener('click', (window as any).joinGameButtonHandler);
        }
        delete (window as any).joinGameButtonHandler;
        (window as any).joinGameButtonSetup = false;
    }

    // **CRITICAL FIX**: Clean up keyboard event listeners for proper re-initialization
    if ((window as any).gameControlsInitialized) {
        if ((window as any).gameKeydownHandler) {
            document.removeEventListener('keydown', (window as any).gameKeydownHandler);
            delete (window as any).gameKeydownHandler;
        }
        if ((window as any).gameKeyupHandler) {
            document.removeEventListener('keyup', (window as any).gameKeyupHandler);
            delete (window as any).gameKeyupHandler;
        }
        (window as any).gameControlsInitialized = false;
    }

    // **ADDITIONAL SAFETY**: Reset key states to prevent stuck keys
    isUpPressed = false;
    isDownPressed = false;
    
    // Remove global leaveGame function
    if ((window as any).leaveGame) {
        delete (window as any).leaveGame;
    }

    // Nullify game objects
    clientConnection = null;
    player1 = null;
    player2 = null;
    ball = null;
    map = null;
    roomId = null;
    localPlayerId = null;
}

// Export leaveGame function for Leave Game button
export function leaveGame(): void {
    // Set game as over to immediately stop input and rendering
    isGameOver = true;
    
    // Send leave game message to server if connection exists
    if (clientConnection) {
        if (clientConnection.leaveGame) {
            clientConnection.leaveGame();
        } else if (clientConnection.socket?.readyState === WebSocket.OPEN) {
            clientConnection.send({ type: 'leaveGame', playerId: localPlayerId });
            setTimeout(() => {
                if (clientConnection?.socket?.readyState === WebSocket.OPEN) {
                    clientConnection.socket.close();
                }
            }, 100);
        }
    }
    cleanup();
}

// Function to setup game loop
function setupGameLoop(): void {
    if (isGameLoopRunning) {
        return;
    }

    let frameCount = 0;
    let lastTime = Date.now();
    let lastPaddleUpdate = Date.now();
    const PADDLE_UPDATE_INTERVAL = 1000 / 60; // 60 updates per second
    
    const renderLoop = () => {
        if (isGameOver) {
            if (map && map.getEngine) {
                map.getEngine.stopRenderLoop();
            }
            isGameLoopRunning = false;
            return;
        }

        frameCount++;
        const now = Date.now();
        if (now - lastTime >= 1000) {
            frameCount = 0;
            lastTime = now;
        }

        const deltaTime = map && map.getEngine ? map.getEngine.getDeltaTime() / 1000 : 0;
        
        // Handle player movement
        if (player1 && player2 && localPlayerId) {
            const localPlayer = player1.getPlayerId() === localPlayerId ? player1 : player2;
            let paddleMoved = false;

            if (isUpPressed && !isDownPressed) {
                localPlayer.move(-1, deltaTime);
                paddleMoved = true;
            } else if (isDownPressed && !isUpPressed) {
                localPlayer.move(1, deltaTime);
                paddleMoved = true;
            }

            // Send paddle position updates at a fixed rate
            if (paddleMoved && now - lastPaddleUpdate >= PADDLE_UPDATE_INTERVAL && clientConnection) {
                const paddlePos = localPlayer.getPaddleBodyPos;
                if (paddlePos) {
                    clientConnection.send({
                        type: 'paddlePosition',
                        playerId: localPlayerId,
                        positionZ: paddlePos.z,
                    });
                    lastPaddleUpdate = now;
                }
            }
        }

        // Update ball position and ensure it's visible
        if (ball && ball.ballBody && map && map.getScene) {
            ball.updateClient(map.getScene);
        }

        // Ensure scene renders
        if (map && map.getScene) {
            map.getScene.render();
        }
    };

    // Start the render loop
    if (map && map.getEngine) {
        map.getEngine.runRenderLoop(renderLoop);
        isGameLoopRunning = true;
    } else {
        console.error('Failed to start game loop: map or engine not initialized');
    }
}

// Export function to setup join game button (called explicitly when needed)
export function setupJoinGameButton(): void {
    // Only setup if not already setup
    if ((window as any).joinGameButtonSetup) {
        return;
    }
    
    const joinGameBtn = document.getElementById('joinGameBtn') as HTMLButtonElement;
    
    if (joinGameBtn) {
        const clickHandler = async () => {
            joinGameBtn.disabled = true;
            updateGameStatus('Checking for available players...');
            
            try {
                const players = await checkAvailablePlayers();
                
                if (players.length < 2) {
                    updateGameStatus('Not enough players registered. Please wait for more players.');
                    joinGameBtn.disabled = false;
                    return;
                }

                // Find an available player slot
                const availablePlayers = players.filter(p => !p.readyToPlay);
                if (availablePlayers.length === 0) {
                    updateGameStatus('All players are already in game. Please wait.');
                    joinGameBtn.disabled = false;
                    return;
                }

                const playerId = availablePlayers[0].id;
                updateGameStatus('Joining game...');
                
                // Initialize game connection
                initializeGame(playerId);
                
                // Set player as ready
                await setPlayerReady(playerId);
                updateGameStatus('Waiting for other player to join...');

            } catch (error) {
                console.error('Error joining game:', error);
                updateGameStatus('Error joining game. Please try again.');
                joinGameBtn.disabled = false;
            }
        };
        
        joinGameBtn.addEventListener('click', clickHandler);
        
        // Store reference for cleanup
        (window as any).joinGameButtonHandler = clickHandler;
        (window as any).joinGameButtonSetup = true;
    }
} 