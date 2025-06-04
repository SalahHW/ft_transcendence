import { playerPaddle } from '../player/player.js';
import { gameMap } from '../map/gameMap.js';
import { webSocketClient } from '../webSocketClient/webSocketClient.js';
import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import { fetchWithSelfSigned } from '../utils/fetch.js';
import '../style.css';

const serverPort = 8080; // Game service port
let clientConnection = null;
let map = null;
let player1, player2, ball;
let roomId = null;
let localPlayerId = null;
let isUpPressed = false;
let isDownPressed = false;
let lastBallPosition = null;
let lastSyncTime = null;
let predictedPosition = null;
let ping = 0;
let pingSamples = [];
let isGameOver = false;
let matchEndTime = null;
let initTime = null;
let syncCount = 0;
let ballUpdateReceived = false;
let isGameLoopRunning = false;

// Function to check available players
async function checkAvailablePlayers() {
    try {
        const response = await fetchWithSelfSigned(`https://localhost:${serverPort}/api/players`, {
            method: 'GET',
        });
        
        const result = await response.json();
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
async function setPlayerReady(playerId) {
    try {
        const response = await fetchWithSelfSigned(`https://localhost:${serverPort}/api/players/${playerId}/ready`, {
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
function updateGameStatus(message) {
    const statusElement = document.getElementById('gameStatus');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Function to initialize the game
function initializeGame(playerId) {
    if (clientConnection) {
        clientConnection.socket.close();
    }
    
    localPlayerId = playerId;
    clientConnection = new webSocketClient(`wss://localhost:${serverPort}/ws`, playerId);

    clientConnection.socket.addEventListener('open', () => {
        console.log('WebSocket connection opened');
        updateGameStatus('Connected to game server');
    });

    clientConnection.socket.addEventListener('error', err => {
        console.error('WebSocket error:', err);
        updateGameStatus('Connection error');
    });

    clientConnection.socket.addEventListener('close', () => {
        console.log('WebSocket connection closed');
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
            movingPlayer.setZ(msg.positionZ);
        }
    });

    // Add ball update handler
    clientConnection.onBallUpdate((msg) => {
        if (!ball) return;
        
        // Ensure ball is visible during respawn
        if (msg.ballState.isRespawning || msg.isInitialSpawn || msg.isScoreRespawn) {
            if (ball.ballBody) {
                ball.ballBody.isVisible = true;
            }
        }
        
        ball.setState(msg.ballState);
    });

    // Add sync handler to ensure positions are correct
    clientConnection.onSync((msg) => {
        if (!player1 || !player2) return;
        
        // Update paddle positions from sync message
        Object.entries(msg.playerPositions).forEach(([playerId, positionZ]) => {
            const syncPlayer = playerId === player1.getPlayerId() ? player1 : player2;
            if (syncPlayer && syncPlayer.getPlayerId() !== localPlayerId) {
                syncPlayer.setZ(positionZ);
            }
        });

        // Update ball state if available
        if (msg.ballState && ball) {
            ball.setState(msg.ballState);
        }
    });

    // Add score update handler with camera shake for losing player
    let previousScores = {};
    clientConnection.onScoreUpdate((msg) => {
        if (!player1 || !player2 || !map) return;
        
        const currentScores = msg.scores;
        
        // Initialize previous scores with zeros if this is the first update
        if (Object.keys(previousScores).length === 0) {
            // Initialize with zeros for both players
            Object.keys(currentScores).forEach(playerId => {
                previousScores[playerId] = 0;
            });
        }
        
        // Check which player's score increased (they scored, opponent lost a point)
        let losingPlayerId = null;
        
        for (const [playerId, currentScore] of Object.entries(currentScores)) {
            const previousScore = previousScores[playerId] || 0;
            if (currentScore > previousScore) {
                // This player scored, so the other player lost a point
                const otherPlayerId = Object.keys(currentScores).find(id => id !== playerId);
                losingPlayerId = otherPlayerId;
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
    clientConnection.onGameEnd((gameEndData) => {
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
        const resultText = isWinner 
            ? `🎉 YOU WON! Final Score: ${gameEndData.winner.score}-${gameEndData.loser.score}`
            : `😔 You Lost. Final Score: ${gameEndData.winner.score}-${gameEndData.loser.score}`;
        
        updateGameStatus(resultText);
    });

    // Add handler for waiting status
    clientConnection.socket.addEventListener('message', (event) => {
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
        roomId = rId;
        localPlayerId = playerId;

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
            if (role === 0) {
                player1 = new playerPaddle('Player1', playerId, 0);
                player2 = new playerPaddle('Player2', opponentId, 1);
            } else {
                player1 = new playerPaddle('Player1', opponentId, 0);
                player2 = new playerPaddle('Player2', playerId, 1);
            }

            try {
                player1.createPaddle(map.getScene, 19.5, 2, 20);
                player2.createPaddle(map.getScene, -19.5, 2, 20);
            } catch (e) {
                console.error('Paddle creation failed:', e);
                return;
            }
        }

        // Only create ball if it doesn't exist
        if (!ball) {
            try {
                ball = new Ball(player1, player2);
                ball.createBall(map.getScene);
                ball.ballBody.metadata = { roomId };
                ball.position = new BABYLON.Vector3(0, -2, 0);
                ball.ballBody.position = new BABYLON.Vector3(0, -2, 0);
                ball.ballBody.isVisible = true;
                ball.isRespawning = true;
                ball.respawnTime = 0;
                ball.hasValidPosition = true;
                
                // Request initial ball respawn from server
                clientConnection.send({
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
        if (!window.gameControlsInitialized) {
            document.addEventListener('keydown', (event) => {
                if (isGameOver) return;
                if (event.key === 'ArrowUp' && !isUpPressed) {
                    isUpPressed = true;
                    clientConnection.send({ type: 'keyDown', direction: 'up' });
                } else if (event.key === 'ArrowDown' && !isDownPressed) {
                    isDownPressed = true;
                    clientConnection.send({ type: 'keyDown', direction: 'down' });
                }
            });

            document.addEventListener('keyup', (event) => {
                if (isGameOver) return;
                if (event.key === 'ArrowUp' && isUpPressed) {
                    isUpPressed = false;
                    clientConnection.send({ type: 'keyUp', direction: 'up' });
                } else if (event.key === 'ArrowDown' && isDownPressed) {
                    isDownPressed = false;
                    clientConnection.send({ type: 'keyUp', direction: 'down' });
                }
            });
            window.gameControlsInitialized = true;
        }
        
        // Start the game loop after match animation if not already running
        if (!isGameLoopRunning) {
            try {
                await map.launchMatchAnimation();
                
                // Ensure paddles are ready
                if (player1 && player2) {
                    player1.paddleBody.isVisible = true;
                    player2.paddleBody.isVisible = true;
                }
                setupGameLoop();
            } catch (e) {
                console.error('Error during game initialization:', e);
                // Start game loop anyway if animation fails
                setupGameLoop();
            }
        }
    });
}

// Function to setup game loop
function setupGameLoop() {
    if (isGameLoopRunning) {
        console.log('Game loop already running, skipping setup');
        return;
    }

    console.log('Setting up game loop...');
    let frameCount = 0;
    let lastTime = Date.now();
    let lastPaddleUpdate = Date.now();
    const PADDLE_UPDATE_INTERVAL = 1000 / 60; // 60 updates per second
    
    const renderLoop = () => {
        if (isGameOver) {
            map.getEngine.stopRenderLoop();
            isGameLoopRunning = false;
            return;
        }

        frameCount++;
        const now = Date.now();
        if (now - lastTime >= 1000) {
            frameCount = 0;
            lastTime = now;
        }

        const deltaTime = map.getEngine.getDeltaTime() / 1000;
        
        // Handle player movement
        const localPlayer = player1.getPlayerId() === localPlayerId ? player1 : player2;
        const playerNumber = player1.getPlayerId() === localPlayerId ? 1 : 2;
        let paddleMoved = false;

        if (isUpPressed && !isDownPressed) {
            localPlayer.move(-1, deltaTime);
            paddleMoved = true;
        } else if (isDownPressed && !isUpPressed) {
            localPlayer.move(1, deltaTime);
            paddleMoved = true;
        }

        // Send paddle position updates at a fixed rate
        if (paddleMoved && now - lastPaddleUpdate >= PADDLE_UPDATE_INTERVAL) {
            clientConnection.send({
                type: 'paddlePosition',
                playerId: localPlayerId,
                positionZ: localPlayer.getPaddleBodyPos.z,
            });
            lastPaddleUpdate = now;
        }

        // Update ball position and ensure it's visible
        if (ball && ball.ballBody) {
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
    const joinGameBtn = document.getElementById('joinGameBtn');
    
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
});