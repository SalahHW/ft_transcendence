import { playerPaddle } from '../player/player.js';
import { gameMap } from '../map/gameMap.js';
import { webSocketClient } from '../webSocketClient/webSocketClient.js';
import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import { fetchWithSelfSigned } from '../utils/fetch.js';

interface PlayerData {
    id: string;
    readyToPlay: boolean;
    [key: string]: any;
}

interface ApiResponse {
    data: PlayerData[];
}

interface GameEndData {
    winner: {
        id: string;
        username: string;
        score: number;
    };
    loser: {
        id: string;
        username: string;
        score: number;
    };
    roomId: string;
    matchDuration: number;
    gameStats: {
        totalRebounds: number;
        forfeit?: boolean;
        reason?: 'player_left' | 'disconnect';
    };
    matchEndTime: Date;
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

// Function to check available players
async function checkAvailablePlayers(): Promise<PlayerData[]> {
    try {
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

// Function to update game status
function updateGameStatus(message: string): void {
    const statusElement = document.getElementById('gameStatus');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Function to initialize the game
export function initializeGame(playerId: string): void {
    if (clientConnection) {
        clientConnection.socket.close();
    }
    
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
        
        // Find the player whose paddle needs to be updated
        const movingPlayer = msg.playerId === player1.getPlayerId() ? player1 : player2;
        
        // Only update if it's not our own paddle
        if (movingPlayer && movingPlayer.getPlayerId() !== localPlayerId) {
            movingPlayer.setZ(msg.positionZ || 0);
        }
    });

    // Add ball update handler
    clientConnection.onBallUpdate((msg) => {
        if (!ball) return;
        
        // Ensure ball is visible during respawn
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
        
        // Update paddle positions from sync message
        if (msg.playerPositions) {
            Object.entries(msg.playerPositions).forEach(([playerId, positionZ]) => {
                const syncPlayer = playerId === player1!.getPlayerId() ? player1 : player2;
                if (syncPlayer && syncPlayer.getPlayerId() !== localPlayerId) {
                    syncPlayer.setZ(positionZ);
                }
            });
        }

        // Update ball state if available
        if (msg.ballState && ball) {
            ball.setState(msg.ballState);
        }
    });

    // Add score update handler with camera shake for losing player
    let previousScores: { [key: string]: number } = {};
    clientConnection.onScoreUpdate((msg) => {
        if (!player1 || !player2 || !map || !msg.scores) return;
        
        const currentScores = msg.scores;
        
        // Initialize previous scores with zeros if this is the first update
        if (Object.keys(previousScores).length === 0) {
            // Initialize with zeros for both players
            Object.keys(currentScores).forEach(playerId => {
                previousScores[playerId] = 0;
            });
        }
        
        // Check which player's score increased (they scored, opponent lost a point)
        let losingPlayerId: string | null = null;
        
        for (const [playerId, currentScore] of Object.entries(currentScores)) {
            const previousScore = previousScores[playerId] || 0;
            if (currentScore > previousScore) {
                // This player scored, so the other player lost a point
                const otherPlayerId = Object.keys(currentScores).find(id => id !== playerId);
                losingPlayerId = otherPlayerId || null;
                break;
            }
        }
        
        // Trigger camera shake only if the local player lost the point
        if (losingPlayerId === localPlayerId) {
            console.log('You lost a point! Triggering camera shake...');
            map.triggerCameraShake().catch(error => {
                console.error('Camera shake failed:', error);
            });
        }
        previousScores = { ...currentScores };
        
        // Update local player scores for display
        if (player1 && player2) {
            const player1Score = currentScores[player1.getPlayerId()] || 0;
            const player2Score = currentScores[player2.getPlayerId()] || 0;
            player1.playerScore = player1Score;
            player2.playerScore = player2Score;
            
            console.log(`Score update: Player1: ${player1Score}, Player2: ${player2Score}`);
        }
    });

    // Add game end handler
    clientConnection.onGameEnd((msg: any) => {
        const gameEndData = msg as GameEndData;
        isGameOver = true;
        
        console.log('='.repeat(50));
        console.log('GAME OVER!');
        console.log('='.repeat(50));
        console.log(`Winner: ${gameEndData.winner.username} (${gameEndData.winner.score})`);
        console.log(`Loser: ${gameEndData.loser.username} (${gameEndData.loser.score})`);
        console.log(`Room: ${gameEndData.roomId}`);
        console.log(`Match Duration: ${gameEndData.matchDuration}ms`);
        console.log(`Total Rebounds: ${gameEndData.gameStats.totalRebounds}`);
        console.log(`Ended at: ${gameEndData.matchEndTime}`);
        console.log('='.repeat(50));
        
        // Update UI to show game results
        const isWinner = gameEndData.winner.id === localPlayerId;
        let resultText;
        
        if (gameEndData.gameStats?.reason === 'player_left') {
            resultText = isWinner 
                ? `🎉 YOU WON! Your opponent left the game.`
                : `😔 You forfeited the game.`;
        } else if (gameEndData.gameStats?.reason === 'disconnect') {
            resultText = isWinner 
                ? `🎉 YOU WON! Your opponent disconnected.`
                : `😔 You disconnected from the game.`;
        } else {
            resultText = isWinner 
                ? `🎉 YOU WON! Final Score: ${gameEndData.winner.score}-${gameEndData.loser.score}`
                : `😔 You Lost. Final Score: ${gameEndData.winner.score}-${gameEndData.loser.score}`;
        }
        
        updateGameStatus(resultText);
        
        // Stop the game loop and clean up
        if (isGameLoopRunning && map?.getEngine) {
            map.getEngine.stopRenderLoop();
            isGameLoopRunning = false;
        }
        
        // Automatically navigate back to main page after a short delay
        setTimeout(() => {
            console.log('🏠 Navigating back to main page...');
            window.history.back();
        }, 3000); // 3 second delay to show the result
    });

    // Add handler for waiting status
    clientConnection.socket.addEventListener('message', (event: MessageEvent) => {
        try {
            const message = JSON.parse(event.data);
            if (message.type === 'waitingForPlayers') {
                updateGameStatus(`Waiting for players... (${message.readyCount}/${message.totalNeeded} ready)`);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    // Set up the game initialization handlers
    clientConnection.onInit(async ({ playerId, roomId: rId, role, opponentId }) => {
        console.log('Received init:', { playerId, roomId: rId, role, opponentId });
        initTime = Date.now();
        roomId = rId || null;
        localPlayerId = playerId || null;

        // Only create new map if it doesn't exist
        if (!map) {
            try {
                map = new gameMap();
                console.log('Creating map...');
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

        // Only create paddles if they don't exist
        if (!player1 || !player2) {
            if (!playerId || !opponentId) {
                console.error('Missing player IDs');
                return;
            }
            
            if (role === 0) {
                player1 = new playerPaddle('Player1', playerId, 0);
                player2 = new playerPaddle('Player2', opponentId, 1);
            } else {
                player1 = new playerPaddle('Player1', opponentId, 0);
                player2 = new playerPaddle('Player2', playerId, 1);
            }

            try {
                player1.createPaddle(map.getScene!, 19.5, 2, 20);
                player2.createPaddle(map.getScene!, -19.5, 2, 20);
            } catch (e) {
                console.error('Paddle creation failed:', e);
                return;
            }
        }

        // Only create ball if it doesn't exist
        if (!ball) {
            try {
                ball = new Ball(player1, player2);
                ball.createBall(map.getScene!);
                if (ball.ballBody) {
                    ball.ballBody.metadata = { roomId };
                    ball.ballBody.position = new BABYLON.Vector3(0, -2, 0);
                    ball.ballBody.isVisible = true;
                }
                ball.position = new BABYLON.Vector3(0, -2, 0);
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

        updateGameStatus('Game starting...');
        
        // Set up keyboard controls if not already set
        if (!(window as any).gameControlsInitialized) {
            document.addEventListener('keydown', (event: KeyboardEvent) => {
                if (isGameOver) return;
                if (event.key === 'ArrowUp' && !isUpPressed) {
                    isUpPressed = true;
                    clientConnection!.send({ type: 'keyDown', direction: 'up' });
                } else if (event.key === 'ArrowDown' && !isDownPressed) {
                    isDownPressed = true;
                    clientConnection!.send({ type: 'keyDown', direction: 'down' });
                }
            });

            document.addEventListener('keyup', (event: KeyboardEvent) => {
                if (isGameOver) return;
                if (event.key === 'ArrowUp' && isUpPressed) {
                    isUpPressed = false;
                    clientConnection!.send({ type: 'keyUp', direction: 'up' });
                } else if (event.key === 'ArrowDown' && isDownPressed) {
                    isDownPressed = false;
                    clientConnection!.send({ type: 'keyUp', direction: 'down' });
                }
            });
            (window as any).gameControlsInitialized = true;
        }
        
        // Start the game loop after match animation if not already running
        if (!isGameLoopRunning) {
            try {
                await map.launchMatchAnimation();
                
                // Notify server that animation is complete
                if (clientConnection) {
                    clientConnection.send({
                        type: 'animationComplete',
                        playerId: localPlayerId
                    });
                    console.log('Sent animationComplete to server');
                }
                
                // Ensure paddles are ready
                if (player1 && player2 && player1.paddleBody && player2.paddleBody) {
                    player1.paddleBody.isVisible = true;
                    player2.paddleBody.isVisible = true;
                }
                setupGameLoop();
            } catch (e) {
                console.error('Error during game initialization:', e);
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
    
    if (isGameLoopRunning && map?.getEngine) {
        map.getEngine.stopRenderLoop();
        isGameLoopRunning = false;
    }

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

    // Clean up remaining resources
    player1 = null;
    player2 = null;
    ball = null;
    map = null;
    roomId = null;
    localPlayerId = null;
}

// Function to setup game loop
function setupGameLoop(): void {
    if (isGameLoopRunning) {
        console.log('Game loop already running, skipping setup');
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

// Handle join game button click
document.addEventListener('DOMContentLoaded', () => {
    const joinGameBtn = document.getElementById('joinGameBtn') as HTMLButtonElement;
    
    if (joinGameBtn) {
        joinGameBtn.addEventListener('click', async () => {
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
        });
    }
}); 