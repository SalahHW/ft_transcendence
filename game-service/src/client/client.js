
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

document.addEventListener('DOMContentLoaded', () => {
    clientConnection.onInit(async ({ playerId, roomId: rId, role, opponentId }) => {
        roomId = rId;
        localPlayerId = playerId;
        console.log(`Initialized player ${playerId} in room ${roomId}, role: ${role}`);

        map = new gameMap();
        map.createMap();
        map.createPlayground();
        console.log('Map and playground created');

        if (role === 0) {
            player1 = new playerPaddle('Player1', playerId, 0);
            player2 = new playerPaddle('Player2', opponentId, 1);
        } else {
            player1 = new playerPaddle('Player1', opponentId, 0);
            player2 = new playerPaddle('Player2', playerId, 1);
        }

        player1.createPaddle(map.getScene, 19.5, 2, 20);
        player2.createPaddle(map.getScene, -19.5, 2, 20);
        console.log(`Paddles created: P1 ID=${player1.getPlayerId()} (x=19.5), P2 ID=${player2.getPlayerId()} (x=-19.5)`);

        map.getEngine.runRenderLoop(() => {
            const localPlayer = player1.getPlayerId() === localPlayerId ? player1 : player2;
            if (isUpPressed && !isDownPressed) {
                localPlayer.move(-1, map.getEngine.getDeltaTime() / 1000);
                //console.log(`Moved local player ${localPlayer.getPlayerId()} up, z=${localPlayer.getPaddleBodyPos.z}`);
                clientConnection.send({
                    type: 'paddlePosition',
                    playerId: localPlayerId,
                    positionZ: localPlayer.getPaddleBodyPos.z,
                });
            } else if (isDownPressed && !isUpPressed) {
                localPlayer.move(1, map.getEngine.getDeltaTime() / 1000);
                //console.log(`Moved local player ${localPlayer.getPlayerId()} down, z=${localPlayer.getPaddleBodyPos.z}`);
                clientConnection.send({
                    type: 'paddlePosition',
                    playerId: localPlayerId,
                    positionZ: localPlayer.getPaddleBodyPos.z,
                });
            }
            if (ball) {
                ball.updateClient(map.getScene);
            }
            map.getScene.render();
        });

        console.log('Starting match animation');
        await map.launchMatchAnimation();
        console.log('Match animation complete');

        ball = new Ball(player1, player2);
        ball.createBall(map.getScene);
        console.log('Ball created at position:', ball.position);

        window.addEventListener('resize', () => map.getEngine.resize());

        clientConnection.onPaddleMove(({ playerId: pid, positionZ }) => {
            //console.log(`Received paddleMove for player ${pid}, positionZ: ${positionZ}`);
            if (pid === localPlayerId) return;
            if (player1.getPlayerId() === pid) {
                //console.log(`Updating player1 (P1 ID=${player1.getPlayerId()}) to z=${positionZ}`);
                player1.setZ(positionZ);
            } else if (player2.getPlayerId() === pid) {
                //console.log(`Updating player2 (P2 ID=${player2.getPlayerId()}) to z=${positionZ}`);
                player2.setZ(positionZ);
            }
        });

        clientConnection.onSync(({ playerPositions, ballState }) => {
            //console.log(`Received sync:`, { playerPositions, ballState });
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
            if (ballState && ball.ballBody) {
                //console.log(`Updating ball state:`, ballState);
                const newPosition = new BABYLON.Vector3(ballState.position.x, ballState.position.y, ballState.position.z);
                if (lastBallPosition) {
                    // Interpolate position
                    const alpha = 0.5; // Adjust for smoother or faster catch-up
                    ball.ballBody.position = BABYLON.Vector3.Lerp(lastBallPosition, newPosition, alpha);
                } else {
                    ball.ballBody.position = newPosition;
                }
                lastBallPosition = ball.ballBody.position.clone();
                ball.setState({
                    position: ball.ballBody.position,
                    velocity: new BABYLON.Vector3(ballState.velocity.x, ballState.velocity.y, ballState.velocity.z),
                    rebounds: ballState.rebounds,
                    isRespawning: ballState.isRespawning,
                    respawnTime: ballState.respawnTime,
                    wasHitByPlayer: ballState.wasHitByPlayer,
                });
            }
        });

        clientConnection.onScoreUpdate(({ scores }) => {
            //console.log(`Received scoreUpdate:`, scores);
            player1.playerScore = scores[player1.getPlayerId()] || 0;
            player2.playerScore = scores[player2.getPlayerId()] || 0;
            console.log(`Scores - P1: ${player1.playerScore}, P2: ${player2.playerScore}`);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowUp' && !isUpPressed) {
                isUpPressed = true;
                clientConnection.send({ type: 'keyDown', direction: 'up' });
                console.log('Sent keyDown: up');
            } else if (event.key === 'ArrowDown' && !isDownPressed) {
                isDownPressed = true;
                clientConnection.send({ type: 'keyDown', direction: 'down' });
                console.log('Sent keyDown: down');
            }
        });

        document.addEventListener('keyup', (event) => {
            if (event.key === 'ArrowUp' && isUpPressed) {
                isUpPressed = false;
                clientConnection.send({ type: 'keyUp', direction: 'up' });
                console.log('Sent keyUp: up');
            } else if (event.key === 'ArrowDown' && isDownPressed) {
                isDownPressed = false;
                clientConnection.send({ type: 'keyUp', direction: 'down' });
                console.log('Sent keyUp: down');
            }
        });
    });
});