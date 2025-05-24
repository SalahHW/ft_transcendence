import { playerPaddle } from '/src/player/player.js';
import { gameMap } from '/src/map/gameMap.js';
import { webSocketClient } from '/src/webSockets/webSocketClient.js';
import { Ball } from '/src/ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import '/src/style.css';

// Use VITE_SERVER_PORT from environment variables
const serverPort = import.meta.env.VITE_SERVER_PORT || 8080;
// Read playerId from URL query parameters
const urlParams = new URLSearchParams(window.location.search);
const playerId = urlParams.get('playerId');

if (!playerId) {
    console.error('Error: playerId is required in URL query parameter (e.g., ?playerId=<uuid>)');
    document.body.innerHTML = '<h1>Error: playerId is required</h1><p>Please include playerId in the URL, e.g., http://localhost:5173?playerId=30781deb-a3b5-48bc-8e1b-31c22d824720</p>';
    throw new Error('playerId is required');
}
console.log('Client initializing with playerId:', playerId);
const clientConnection = new webSocketClient(`wss://localhost:${serverPort}/ws`, playerId);

// Debug WebSocket events
clientConnection.socket.addEventListener('open', () => {
    console.log('WebSocket connection opened');
});
clientConnection.socket.addEventListener('error', (err) => {
    console.error('WebSocket error:', err);
});
clientConnection.socket.addEventListener('close', () => {
    console.log('WebSocket connection closed');
});

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

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded triggered');
    clientConnection.onInit(async ({ playerId, roomId: rId, role, opponentId }) => {
        console.log('Received init:', { playerId, roomId: rId, role, opponentId });
        initTime = Date.now();
        roomId = rId;
        localPlayerId = playerId;

        try {
            map = new gameMap();
            console.log('Creating map...');
            map.createMap();
            map.createPlayground();
            console.log('Map created successfully');
        } catch (e) {
            console.error('Map creation failed:', e);
        }

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
            console.log('Paddles created successfully');
        } catch (e) {
            console.error('Paddle creation failed:', e);
        }

        // Create ball early
        try {
            ball = new Ball(player1, player2);
            ball.createBall(map.getScene);
            console.log('Ball created successfully');
        } catch (e) {
            console.error('Ball creation failed:', e);
        }

        let frameCount = 0;
        let lastTime = Date.now();
        const renderLoop = () => {
            if (isGameOver) return;

            frameCount++;
            const now = Date.now();
            if (now - lastTime >= 1000) {
                frameCount = 0;
                lastTime = now;
            }

            const deltaTime = map.getEngine.getDeltaTime() / 1000;
            const localPlayer = player1.getPlayerId() === localPlayerId ? player1 : player2;
            if (isUpPressed && !isDownPressed) {
                localPlayer.move(-1, deltaTime);
                clientConnection.send({
                    type: 'paddlePosition',
                    playerId: localPlayerId,
                    positionZ: localPlayer.getPaddleBodyPos.z,
                });
            } else if (isDownPressed && !isUpPressed) {
                localPlayer.move(1, deltaTime);
                clientConnection.send({
                    type: 'paddlePosition',
                    playerId: localPlayerId,
                    positionZ: localPlayer.getPaddleBodyPos.z,
                });
            }
            if (ball && ball.ballBody) {
                if (ball.isRespawning) {
                    console.log('Render loop: Ball is respawning');
                }
                if (ball.hasValidPosition && !ball.isRespawning) {
                    predictedPosition = predictedPosition || ball.ballBody.position.clone();
                    const effectiveDeltaTime = deltaTime + ping / 2;
                    predictedPosition.addInPlace(ball.velocity.scale(effectiveDeltaTime));
                    predictedPosition.x = Math.max(-20, Math.min(20, predictedPosition.x));
                    predictedPosition.z = Math.max(-10, Math.min(10, predictedPosition.z));
                    ball.ballBody.position.copyFrom(predictedPosition);
                }
                ball.updateClient(map.getScene);
            }
            map.getScene.render();
        };
        map.getEngine.runRenderLoop(renderLoop);

        try {
            console.log('Starting match animation');
            await map.launchMatchAnimation();
            console.log('Match animation completed');
            clientConnection.send({
                type: 'animationComplete',
                playerId: localPlayerId
            });
        } catch (e) {
            console.error('Match animation failed:', e);
        }

        window.addEventListener('resize', () => map.getEngine.resize());

        clientConnection.onPaddleMove(({ playerId: pid, positionZ }) => {
            if (isGameOver) return;
            if (pid === localPlayerId) return;
            if (player1.getPlayerId() === pid) {
                player1.setZ(positionZ);
            } else if (player2.getPlayerId() === pid) {
                player2.setZ(positionZ);
            }
        });

        clientConnection.onSync(({ playerPositions, ballState, serverTime }) => {
            if (isGameOver) return;
            syncCount++;
            //if (syncCount % 10 === 0) {
            //    console.log('Received sync:', { playerPositions, ballState, serverTime });
            //}

            const now = Date.now();
            if (serverTime) {
                const rtt = (now - serverTime) / 1000;
                pingSamples.push(rtt);
                if (pingSamples.length > 10) pingSamples.shift();
                ping = pingSamples.reduce((a, b) => a + b, 0) / pingSamples.length;
            }

            Object.entries(playerPositions).forEach(([pid, positionZ]) => {
                if (player1.getPlayerId() === pid) {
                    if (pid === localPlayerId) {
                        const currentZ = player1.getPaddleBodyPos.z;
                        const diff = Math.abs(positionZ - currentZ);
                        if (diff > 0.1) {
                            player1.setZ(positionZ);
                        }
                    } else {
                        player1.setZ(positionZ);
                    }
                } else if (player2.getPlayerId() === pid) {
                    if (pid === localPlayerId) {
                        const currentZ = player2.getPaddleBodyPos.z;
                        const diff = Math.abs(positionZ - currentZ);
                        if (diff > 0.1) {
                            player2.setZ(positionZ);
                        }
                    } else {
                        player2.setZ(positionZ);
                    }
                }
            });

            if (ballState && ball && ball.ballBody && ball.hasValidPosition) {
                const newPosition = new BABYLON.Vector3(ballState.position.x, ballState.position.y, ballState.position.z);
                const now = Date.now();
                if (lastBallPosition && lastSyncTime && predictedPosition) {
                    const timeSinceSync = (now - lastSyncTime) / 1000 + ping / 2;
                    const syncInterval = 0.005 + ping;
                    const alpha = Math.min(timeSinceSync / syncInterval, 1);
                    const interpolatedPosition = BABYLON.Vector3.Lerp(predictedPosition, newPosition, alpha);
                    ball.ballBody.position.copyFrom(interpolatedPosition);
                    predictedPosition = interpolatedPosition.clone();
                } else {
                    ball.ballBody.position.copyFrom(newPosition);
                    predictedPosition = newPosition.clone();
                }
                lastBallPosition = newPosition.clone();
                lastSyncTime = now;
                ball.setState({
                    position: ball.ballBody.position,
                    velocity: new BABYLON.Vector3(ballState.velocity.x, ballState.velocity.y, ballState.velocity.z),
                    previousVelocity: ballState.previousVelocity || new BABYLON.Vector3(ballState.velocity.x, ballState.velocity.y, ballState.velocity.z),
                    rebounds: ballState.rebounds || 0,
                    isRespawning: ballState.isRespawning || false,
                    respawnTime: ballState.respawnTime || 0,
                    wasHitByPlayer: ballState.wasHitByPlayer || false,
                    hasValidPosition: true,
                    speed: ballState.speed || 25,
                    isInitialSpawn: ballState.isInitialSpawn || false
                });
            }
        });

        clientConnection.onScoreUpdate(({ scores }) => {
            if (isGameOver) return;
            console.log('Received scoreUpdate:', { scores });
            player1.playerScore = scores[player1.getPlayerId()] || 0;
            player2.playerScore = scores[player2.getPlayerId()] || 0;
        });

        clientConnection.onBallUpdate(({ ballState, isInitialSpawn, isScoreRespawn }) => {
            if (isGameOver) return;
            const now = Date.now();
            console.log(`Received ballUpdate at ${now}:`, { ballState, isInitialSpawn, isScoreRespawn });
            if (initTime) {
                console.log(`Time since init: ${(now - initTime)}ms`);
            }
            if (!ballState || !ballState.position || !ballState.velocity) {
                console.error('Invalid ballState:', ballState);
                return;
            }
            if (ballState && ball && ball.ballBody) {
                const newPosition = new BABYLON.Vector3(ballState.position.x, ballState.position.y, ballState.position.z);
                const isRespawn = (isInitialSpawn || isScoreRespawn) && ballState.isRespawning;
                const isPositionValid = isRespawn ? newPosition.y >= -2 && newPosition.y <= 1 : true;

                ball.ballBody.isVisible = isInitialSpawn || isRespawn || isPositionValid;
                ball.ballBody.position = newPosition;
                predictedPosition = newPosition.clone();
                lastBallPosition = null;
                try {
                    ball.setState({
                        position: newPosition,
                        velocity: new BABYLON.Vector3(ballState.velocity.x, ballState.velocity.y, ballState.velocity.z),
                        previousVelocity: ballState.previousVelocity || new BABYLON.Vector3(ballState.velocity.x, ballState.velocity.y, ballState.velocity.z),
                        rebounds: ballState.rebounds || 0,
                        isRespawning: ballState.isRespawning || false,
                        respawnTime: ballState.respawnTime || 0,
                        wasHitByPlayer: ballState.wasHitByPlayer || false,
                        hasValidPosition: isPositionValid,
                        speed: ballState.speed || 25,
                        isInitialSpawn: isInitialSpawn || false
                    });
                    console.log('Ball state updated:', {
                        position: ball.position,
                        isRespawning: ball.isRespawning,
                        hasValidPosition: ball.hasValidPosition,
                        isVisible: ball.ballBody.isVisible,
                        respawnTime: ball.respawnTime
                    });
                    if (!ball.isRespawning && ball.hasValidPosition) {
                        console.log('Ball active and visible at position:', newPosition);
                    }
                } catch (e) {
                    console.error('Ball setState failed:', e);
                }
            }
        });

        clientConnection.onGameEnd(({ winnerId, scores, matchEndTime: endTime }) => {
            isGameOver = true;
            matchEndTime = endTime;
            const winnerName = winnerId === player1.getPlayerId() ? player1.name : player2.name;
            const scoreText = `Final Score - ${player1.name}: ${scores[player1.getPlayerId()]}, ${player2.name}: ${scores[player2.getPlayerId()]}`;
            alert(`${winnerName} wins!\n${scoreText}\nMatch ended at: ${new Date(matchEndTime).toISOString()}`);
            console.log(`Game ended: Winner=${winnerName}, ${scoreText}, Match ended at: ${new Date(matchEndTime).toISOString()}`);
            map.getEngine.stopRenderLoop();
            if (ball && ball.ballBody) ball.ballBody.isVisible = false;
            if (player1.paddleBody) player1.paddleBody.isVisible = false;
            if (player2.paddleBody) player2.paddleBody.isVisible = false;
        });

        clientConnection.onMessage = ({ data }) => {
            let msg;
            try {
                msg = JSON.parse(data);
            } catch (e) {
                console.error('Invalid JSON:', e);
                return;
            }
            if (msg.type === 'usernameUpdate') {
                if (msg.playerId === player1.getPlayerId()) {
                    player1.name = msg.username;
                    console.log(`Player1 updated username to ${msg.username}`);
                } else if (msg.playerId === player2.getPlayerId()) {
                    player2.name = msg.username;
                    console.log(`Player2 updated username to ${msg.username}`);
                }
            }
        };

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
    });
});