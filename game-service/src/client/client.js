import { playerPaddle } from '/src/player/player.js';
import { gameMap } from '/src/map/gameMap.js';
import { webSocketClient } from '/src/webSockets/webSocketClient.js';
import { Ball } from '/src/ball/ball.js';
import * as BABYLON from '@babylonjs/core';
import '/src/style.css';

const clientConnection = new webSocketClient('wss://localhost:8080');

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
let isGameOver = false; // New: Track game over state

document.addEventListener('DOMContentLoaded', () => {
    clientConnection.onInit(async ({ playerId, roomId: rId, role, opponentId }) => {
        roomId = rId;
        localPlayerId = playerId;
        //console.log(`Initialized player ${playerId} in room ${roomId}, role: ${role}`);

        map = new gameMap();
        map.createMap();
        map.createPlayground();
        //console.log('Map and playground created');

        if (role === 0) {
            player1 = new playerPaddle('Player1', playerId, 0);
            player2 = new playerPaddle('Player2', opponentId, 1);
        } else {
            player1 = new playerPaddle('Player1', opponentId, 0);
            player2 = new playerPaddle('Player2', playerId, 1);
        }

        player1.createPaddle(map.getScene, 19.5, 2, 20);
        player2.createPaddle(map.getScene, -19.5, 2, 20);
        //console.log(`Paddles created: P1 ID=${player1.getPlayerId()} (x=19.5), P2 ID=${player2.getPlayerId()} (x=-19.5)`);

        let frameCount = 0;
        let lastTime = Date.now();
        const renderLoop = () => {
            if (isGameOver) return; // New: Stop rendering if game is over

            frameCount++;
            const now = Date.now();
            if (now - lastTime >= 1000) {
                //console.log(`Client FPS: ${frameCount}`);
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
            if (ball && ball.ballBody && ball.hasValidPosition && !ball.isRespawning) {
                predictedPosition = predictedPosition || ball.ballBody.position.clone();
                const effectiveDeltaTime = deltaTime + ping / 2;
                predictedPosition.addInPlace(ball.velocity.scale(effectiveDeltaTime));
                predictedPosition.x = Math.max(-20, Math.min(20, predictedPosition.x));
                predictedPosition.z = Math.max(-10, Math.min(10, predictedPosition.z));
                ball.ballBody.position.copyFrom(predictedPosition);
                //console.log(`Predicted: position=(${predictedPosition.x.toFixed(3)}, ${predictedPosition.y.toFixed(3)}, ${predictedPosition.z.toFixed(3)}), deltaTime=${deltaTime.toFixed(3)}, ping=${(ping * 1000).toFixed(1)}ms`);
                ball.updateClient(map.getScene);
            } else if (ball) {
                ball.updateClient(map.getScene);
            }
            map.getScene.render();
        };
        map.getEngine.runRenderLoop(renderLoop);

        //console.log('Starting match animation');
        await map.launchMatchAnimation();
        //console.log('Match animation complete');

        ball = new Ball(player1, player2);
        clientConnection.send({ type: 'requestBallRespawn' });

        window.addEventListener('resize', () => map.getEngine.resize());

        clientConnection.onPaddleMove(({ playerId: pid, positionZ }) => {
            if (isGameOver) return; // New: Ignore if game is over
            if (pid === localPlayerId) return;
            if (player1.getPlayerId() === pid) {
                player1.setZ(positionZ);
            } else if (player2.getPlayerId() === pid) {
                player2.setZ(positionZ);
            }
        });

        clientConnection.onSync(({ playerPositions, ballState, serverTime }) => {
            if (isGameOver) return; // New: Ignore if game is over

            const now = Date.now();
            if (serverTime) {
                const rtt = (now - serverTime) / 1000;
                pingSamples.push(rtt);
                if (pingSamples.length > 10) pingSamples.shift();
                ping = pingSamples.reduce((a, b) => a + b, 0) / pingSamples.length;
                //console.log(`Ping updated: ${(ping * 1000).toFixed(1)}ms, samples=${pingSamples.length}`);
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
            if (ballState && ball.ballBody && ball.hasValidPosition) {
                const newPosition = new BABYLON.Vector3(ballState.position.x, ballState.position.y, ballState.position.z);
                const now = Date.now();
                if (lastBallPosition && lastSyncTime && predictedPosition) {
                    const timeSinceSync = (now - lastSyncTime) / 1000 + ping / 2;
                    const syncInterval = 0.005 + ping;
                    const alpha = Math.min(timeSinceSync / syncInterval, 1);
                    const interpolatedPosition = BABYLON.Vector3.Lerp(predictedPosition, newPosition, alpha);
                    ball.ballBody.position.copyFrom(interpolatedPosition);
                    //console.log(`Sync corrected: alpha=${alpha.toFixed(3)}, position=(${interpolatedPosition.x.toFixed(3)}, ${interpolatedPosition.y.toFixed(3)}, ${interpolatedPosition.z.toFixed(3)}), serverPos=(${newPosition.x.toFixed(3)}, ${newPosition.y.toFixed(3)}, ${newPosition.z.toFixed(3)}), ping=${(ping * 1000).toFixed(1)}ms`);
                    predictedPosition = interpolatedPosition.clone();
                } else {
                    ball.ballBody.position.copyFrom(newPosition);
                    predictedPosition = newPosition.clone();
                    //console.log(`Sync direct: position=(${newPosition.x.toFixed(3)}, ${newPosition.y.toFixed(3)}, ${newPosition.z.toFixed(3)}), ping=${(ping * 1000).toFixed(1)}ms`);
                }
                lastBallPosition = newPosition.clone();
                lastSyncTime = now;
                ball.setState({
                    position: ball.ballBody.position,
                    velocity: new BABYLON.Vector3(ballState.velocity.x, ballState.velocity.y, ballState.velocity.z),
                    previousVelocity: ballState.previousVelocity || new BABYLON.Vector3(ballState.velocity.x, ballState.velocity.y, ballState.velocity.z),
                    rebounds: ballState.rebounds,
                    isRespawning: ballState.isRespawning,
                    respawnTime: ballState.respawnTime,
                    wasHitByPlayer: ballState.wasHitByPlayer,
                    hasValidPosition: true,
                    speed: ballState.speed,
                });
            }
        });

        clientConnection.onScoreUpdate(({ scores }) => {
            if (isGameOver) return; // New: Ignore if game is over
            player1.playerScore = scores[player1.getPlayerId()] || 0;
            player2.playerScore = scores[player2.getPlayerId()] || 0;
            //console.log(`Scores - P1: ${player1.playerScore}, P2: ${player2.playerScore}`);
        });

        clientConnection.onBallUpdate(({ ballState, isInitialSpawn, isScoreRespawn }) => {
            if (isGameOver) return; // New: Ignore if game is over
            if (ballState && !ball.ballBody) {
                ball.createBall(map.getScene);
                //console.log('Ball created at position:', ball.position.asArray());
            }
            if (ballState && ball.ballBody) {
                const newPosition = new BABYLON.Vector3(ballState.position.x, ballState.position.y, ballState.position.z);
                //console.log(`Received ballUpdate: position=(${newPosition.x.toFixed(3)}, ${newPosition.y.toFixed(3)}, ${newPosition.z.toFixed(3)}), isInitialSpawn=${isInitialSpawn}, isScoreRespawn=${isScoreRespawn}, isRespawning=${ballState.isRespawning}, respawnTime=${ballState.respawnTime}`);
                const isRespawn = (isInitialSpawn || isScoreRespawn) && ballState.isRespawning;
                const isPositionValid = isRespawn ? newPosition.y >= -2 && newPosition.y <= 1 : true;
                if (!isPositionValid) {
                    //console.warn(`Invalid respawn position: y=${newPosition.y.toFixed(3)}, expected y between -2 and 1, respawnTime=${ballState.respawnTime}`);
                }
                ball.ballBody.isVisible = false;
                ball.ballBody.position = newPosition;
                predictedPosition = newPosition.clone();
                lastBallPosition = null;
                ball.setState({
                    position: newPosition,
                    velocity: new BABYLON.Vector3(ballState.velocity.x, ballState.velocity.y, ballState.velocity.z),
                    previousVelocity: ballState.previousVelocity || new BABYLON.Vector3(ballState.velocity.x, ballState.velocity.y, ballState.velocity.z),
                    rebounds: ballState.rebounds,
                    isRespawning: ballState.isRespawning,
                    respawnTime: ballState.respawnTime,
                    wasHitByPlayer: ballState.wasHitByPlayer,
                    hasValidPosition: isPositionValid,
                    speed: ballState.speed,
                });
                if (ball.hasValidPosition) {
                    ball.ballBody.isVisible = true;
                    //console.log(`${isInitialSpawn ? 'Initial' : isScoreRespawn ? 'Score' : 'Update'}: Ball position set to (${newPosition.x.toFixed(3)}, ${newPosition.y.toFixed(3)}, ${newPosition.z.toFixed(3)}), valid=${ball.hasValidPosition}, visible=${ball.ballBody.isVisible}, respawnTime=${ballState.respawnTime}`);
                }
            }
        });

        // New: Handle gameEnd message
        clientConnection.onGameEnd(({ winnerId, scores }) => {
            isGameOver = true;
            const winnerName = winnerId === player1.getPlayerId() ? 'Player 1' : 'Player 2';
            const scoreText = `Final Score - Player 1: ${scores[player1.getPlayerId()]}, Player 2: ${scores[player2.getPlayerId()]}`;
            alert(`${winnerName} wins!\n${scoreText}`);
            console.log(`Game ended: Winner=${winnerName}, ${scoreText}`);
            // Stop rendering
            map.getEngine.stopRenderLoop();
            // Hide ball and paddles
            if (ball && ball.ballBody) ball.ballBody.isVisible = false;
            if (player1.paddleBody) player1.paddleBody.isVisible = false;
            if (player2.paddleBody) player2.paddleBody.isVisible = false;
        });

        document.addEventListener('keydown', (event) => {
            if (isGameOver) return; // New: Ignore inputs if game is over
            if (event.key === 'ArrowUp' && !isUpPressed) {
                isUpPressed = true;
                clientConnection.send({ type: 'keyDown', direction: 'up' });
                //console.log('Sent keyDown: up');
            } else if (event.key === 'ArrowDown' && !isDownPressed) {
                isDownPressed = true;
                clientConnection.send({ type: 'keyDown', direction: 'down' });
                //console.log('Sent keyDown: down');
            }
        });

        document.addEventListener('keyup', (event) => {
            if (isGameOver) return; // New: Ignore inputs if game is over
            if (event.key === 'ArrowUp' && isUpPressed) {
                isUpPressed = false;
                clientConnection.send({ type: 'keyUp', direction: 'up' });
                //console.log('Sent keyUp: up');
            } else if (event.key === 'ArrowDown' && isDownPressed) {
                isDownPressed = false;
                clientConnection.send({ type: 'keyUp', direction: 'down' });
                //console.log('Sent keyUp: down');
            }
        });
    });
});