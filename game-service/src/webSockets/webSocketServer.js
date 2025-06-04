import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';
import fs from 'fs';
import { Ball } from '../ball/ball.js';
import * as BABYLON from '@babylonjs/core';

export class webSocketGameServer {
    constructor(port) {
        if (!port || isNaN(port) || port <= 0) {
            throw new Error('A valid port number must be provided');
        }
        this.port = port;
        this.serverConfig = this.loadSecurityConfig();
        this.server = this.createHttpsServer();
        this.webSocketServer = this.initializeWebSocketServer();
        this.gameRooms = new Map();
        this.players = new Map();
        this.setupConnectionHandlers();
        this.startServer();
        this.startGameLoop();
    }

    loadSecurityConfig() {
        return {
            cert: fs.readFileSync('src/server/certs/cert.pem'),
            key: fs.readFileSync('src/server/certs/key.pem'),
        };
    }

    createHttpsServer() {
        return https.createServer(this.serverConfig, (req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('WebSocket server is running\n');
        });
    }

    initializeWebSocketServer() {
        return new WebSocketServer({ server: this.server });
    }

    setupConnectionHandlers() {
        this.webSocketServer.on('connection', (ws) => {
            this.handleNewPlayerConnection(ws);
        });
    }

    handleNewPlayerConnection(ws) {
        const newPlayer = this.createNewPlayer(ws);
        this.players.set(newPlayer.id, newPlayer);

        const assignedRoom = this.findOrCreateGameRoomForPlayer(newPlayer);
        this.setupPlayerConnectionMetadata(ws, newPlayer.id, assignedRoom);
        this.logPlayerConnection(newPlayer.id, assignedRoom);

        const room = this.gameRooms.get(assignedRoom);
        if (room.players.length === 2) {
            this.notifyPlayersGameStart(room.players, assignedRoom);
            room.ball = new Ball(
                { playerId: room.players[0].id, playerScore: 0 },
                { playerId: room.players[1].id, playerScore: 0 }
            );
            room.ball.init();
            const ballState = {
                position: { x: room.ball.position.x, y: room.ball.position.y, z: room.ball.position.z },
                velocity: { x: room.ball.velocity.x, y: room.ball.velocity.y, z: room.ball.velocity.z },
                previousVelocity: { x: room.ball.previousVelocity.x, y: room.ball.previousVelocity.y, z: room.ball.previousVelocity.z },
                rebounds: room.ball.rebounds,
                isRespawning: room.ball.isRespawning,
                respawnTime: room.ball.respawnTime,
                wasHitByPlayer: room.ball.wasHitByPlayer,
                speed: room.ball.speed,
                currentGlowColor: room.ball.currentGlowColor ? 
                  { r: room.ball.currentGlowColor.r, g: room.ball.currentGlowColor.g, b: room.ball.currentGlowColor.b } :
                  { r: 0, g: 0, b: 0 },
                shouldGlow: room.ball.shouldGlow || false
            };
            this.broadcastToRoom(assignedRoom, {
                type: 'ballUpdate',
                ballState,
                isInitialSpawn: true,
            });
        }

        ws.on('message', (data) => this.handlePlayerInput(data, newPlayer.id, assignedRoom));
        ws.on('close', () => this.handlePlayerDisconnect(newPlayer.id, assignedRoom));
    }

    createNewPlayer(ws) {
        return {
            ws,
            id: uuidv4(),
            positionZ: 0,
            isUpPressed: false,
            isDownPressed: false,
            lastUpdate: Date.now(),
            playerScore: 0,
        };
    }

    findOrCreateGameRoomForPlayer(player) {
        for (const [roomId, room] of this.gameRooms.entries()) {
            if (room.players.length < 2) {
                room.players.push(player);
                return roomId;
            }
        }
        // MOD HERE TO GENERATE IN INSTEAD OF UUID -> MAKE FUNCTION THAT CHECKS IF ID EXISTS BEFORE SETTING
        const newRoomId = uuidv4();
        this.gameRooms.set(newRoomId, { players: [player], ball: null, isGameOver: false });
        return newRoomId;
    }

    setupPlayerConnectionMetadata(ws, playerId, roomId) {
        ws.playerId = playerId;
        ws.roomId = roomId;
    }

    logPlayerConnection(playerId, roomId) {
        console.log(`Player connected: ${playerId} in room ${roomId}`);
    }

    notifyPlayersGameStart(players, roomId) {
        players.forEach((player, i) => {
            const otherPlayer = players[1 - i];
            player.ws.send(JSON.stringify({
                type: 'init',
                playerId: player.id,
                roomId,
                role: i,
                opponentId: otherPlayer.id,
            }));
        });
    }

    // New: Check for end game condition
    endGame(room, roomId) {
        if (!room.ball || room.isGameOver) return null;

        const score1 = room.ball.player1.playerScore;
        const score2 = room.ball.player2.playerScore;
        let winnerId = null;

        if (score1 >= 11 && score1 > score2) {
            winnerId = room.players[0].id;
        } else if (score2 >= 11 && score2 > score1) {
            winnerId = room.players[1].id;
        } 
        if (winnerId) {
            room.isGameOver = true;
            this.broadcastToRoom(roomId, {
                type: 'gameEnd',
                winnerId,
                scores: {
                    [room.players[0].id]: score1,
                    [room.players[1].id]: score2,
                },
            });
        }

        return winnerId;
    }

    handlePlayerInput(data, playerId, roomId) {
        let msg;
        try {
            msg = JSON.parse(data);
        } catch (e) {
            return console.error('Bad JSON:', e);
        }

        const player = this.players.get(playerId);
        const room = this.gameRooms.get(roomId) || { players: [] };
        if (room.players.length !== 2 || room.isGameOver) return;

        if (msg.type === 'keyDown') {
            if (msg.direction === 'up') {
                player.isUpPressed = true;
            } else if (msg.direction === 'down') {
                player.isDownPressed = true;
            }
        } else if (msg.type === 'keyUp') {
            if (msg.direction === 'up') {
                player.isUpPressed = false;
            } else if (msg.direction === 'down') {
                player.isDownPressed = false;
            }
        } else if (msg.type === 'paddlePosition') {
            const { positionZ } = msg;
            const now = Date.now();
            const deltaTime = (now - player.lastUpdate) / 1000;
            const maxDeltaZ = 20 * deltaTime;
            const clampedZ = Math.max(-7.5, Math.min(7.5, positionZ));
            const diff = Math.abs(clampedZ - player.positionZ);
            if (diff <= maxDeltaZ + 0.01) {
                player.positionZ = Number(clampedZ.toFixed(3));
            }
            player.lastUpdate = now;
        } else if (msg.type === 'requestBallRespawn') {
            if (!room.ball) {
                room.ball = new Ball(
                    { playerId: room.players[0].id, playerScore: 0 },
                    { playerId: room.players[1].id, playerScore: 0 }
                );
                //console.log(`Room ${roomId} ball created on requestBallRespawn`);
            }
            room.ball.init();
            const ballState = {
                position: { x: room.ball.position.x, y: room.ball.position.y, z: room.ball.position.z },
                velocity: { x: room.ball.velocity.x, y: room.ball.velocity.y, z: room.ball.velocity.z },
                previousVelocity: { x: room.ball.previousVelocity.x, y: room.ball.previousVelocity.y, z: room.ball.previousVelocity.z },
                rebounds: room.ball.rebounds,
                isRespawning: room.ball.isRespawning,
                respawnTime: room.ball.respawnTime,
                wasHitByPlayer: room.ball.wasHitByPlayer,
                speed: room.ball.speed,
                currentGlowColor: room.ball.currentGlowColor ? 
                  { r: room.ball.currentGlowColor.r, g: room.ball.currentGlowColor.g, b: room.ball.currentGlowColor.b } :
                  { r: 0, g: 0, b: 0 },
                shouldGlow: room.ball.shouldGlow || false
            };
            if (ballState.isRespawning && ballState.respawnTime === 0 && ballState.position.y !== -2) {
                console.error(`Invalid initial ball position: y=${ballState.position.y}, expected y=-2`);
                ballState.position.y = -2;
            }
            this.broadcastToRoom(roomId, {
                type: 'ballUpdate',
                ballState,
                isInitialSpawn: true,
            });
        }
    }

    startGameLoop() {
        const FPS = 1000;
        const BROADCAST_FPS = 60;
        const SYNC_INTERVAL = 5;
        let lastBroadcast = Date.now();
        let lastSync = Date.now();
        let frameCount = 0;
        let lastFrameTime = Date.now();

        const update = () => {
            const now = Date.now();
            const deltaTime = 1 / FPS;
            frameCount++;
            if (now - lastFrameTime >= 1000) {
                frameCount = 0;
                lastFrameTime = now;
            }

            this.gameRooms.forEach((room, roomId) => {
                if (room.players.length !== 2 || room.isGameOver) return;

                room.players.forEach((player, index) => {
                    const speed = 20;
                    const halfD = 7.5;
                    let moved = false;
                    if (player.isUpPressed && !player.isDownPressed) {
                        const newZ = player.positionZ - speed * deltaTime;
                        player.positionZ = Math.max(-halfD, newZ);
                        moved = newZ !== player.positionZ;
                    } else if (player.isDownPressed && !player.isUpPressed) {
                        const newZ = player.positionZ + speed * deltaTime;
                        player.positionZ = Math.min(halfD, newZ);
                        moved = newZ !== player.positionZ;
                    }
                    player.positionZ = Number(player.positionZ.toFixed(3));

                    if ((player.isUpPressed || player.isDownPressed) && now - lastBroadcast >= 1000 / BROADCAST_FPS) {
                        this.broadcastToRoom(roomId, {
                            type: 'paddleMove',
                            playerId: player.id,
                            positionZ: player.positionZ,
                        });
                    }
                });

                if (room.ball) {
                    const paddle1Pos = new BABYLON.Vector3(19.5, 2, room.players[0].positionZ);
                    const paddle2Pos = new BABYLON.Vector3(-19.5, 2, room.players[1].positionZ);
                    const prevScore1 = room.ball.player1.playerScore;
                    const prevScore2 = room.ball.player2.playerScore;
                    room.ball.update(deltaTime, paddle1Pos, paddle2Pos);
                    if (room.ball.player1.playerScore !== prevScore1 || room.ball.player2.playerScore !== prevScore2) {
                        this.broadcastToRoom(roomId, {
                            type: 'scoreUpdate',
                            scores: {
                                [room.players[0].id]: room.ball.player1.playerScore,
                                [room.players[1].id]: room.ball.player2.playerScore,
                            },
                        });
                        const ballState = {
                            position: { x: room.ball.position.x, y: room.ball.position.y, z: room.ball.position.z },
                            velocity: { x: room.ball.velocity.x, y: room.ball.velocity.y, z: room.ball.velocity.z },
                            previousVelocity: { x: room.ball.previousVelocity.x, y: room.ball.previousVelocity.y, z: room.ball.previousVelocity.z },
                            rebounds: room.ball.rebounds,
                            isRespawning: room.ball.isRespawning,
                            respawnTime: room.ball.respawnTime,
                            wasHitByPlayer: room.ball.wasHitByPlayer,
                            speed: room.ball.speed,
                            currentGlowColor: room.ball.currentGlowColor ? 
                              { r: room.ball.currentGlowColor.r, g: room.ball.currentGlowColor.g, b: room.ball.currentGlowColor.b } :
                              { r: 0, g: 0, b: 0 },
                            shouldGlow: room.ball.shouldGlow || false
                        };
                        if (ballState.isRespawning && ballState.respawnTime === 0 && ballState.position.y !== -2) {
                            console.error(`Invalid score ball position: y=${ballState.position.y}, expected y=-2`);
                            ballState.position.y = -2;
                        }
                        this.broadcastToRoom(roomId, {
                            type: 'ballUpdate',
                            ballState,
                            isScoreRespawn: true,
                        });
                        // New: Check for end game after score update
                        this.endGame(room, roomId);
                    }
                }

                if (now - lastSync >= SYNC_INTERVAL) {
                    const playerPositions = {};
                    room.players.forEach(player => {
                        playerPositions[player.id] = player.positionZ;
                    });
                    const ballState = room.ball ? {
                        position: { x: room.ball.position.x, y: room.ball.position.y, z: room.ball.position.z },
                        velocity: { x: room.ball.velocity.x, y: room.ball.velocity.y, z: room.ball.velocity.z },
                        previousVelocity: { x: room.ball.previousVelocity.x, y: room.ball.previousVelocity.y, z: room.ball.previousVelocity.z },
                        rebounds: room.ball.rebounds,
                        isRespawning: room.ball.isRespawning,
                        respawnTime: room.ball.respawnTime,
                        wasHitByPlayer: room.ball.wasHitByPlayer,
                        speed: room.ball.speed,
                        currentGlowColor: room.ball.currentGlowColor ? 
                          { r: room.ball.currentGlowColor.r, g: room.ball.currentGlowColor.g, b: room.ball.currentGlowColor.b } :
                          { r: 0, g: 0, b: 0 },
                        shouldGlow: room.ball.shouldGlow || false
                    } : null;
                    this.broadcastToRoom(roomId, {
                        type: 'sync',
                        playerPositions,
                        ballState,
                        serverTime: now,
                    });
                    lastSync = now;
                }
            });

            if (now - lastBroadcast >= 1000 / BROADCAST_FPS) {
                lastBroadcast = now;
            }

            setTimeout(update, 1000 / FPS);
        };
        update();
    }

    handlePlayerDisconnect(playerId, roomId) {
        console.log(`Player disconnected: ${playerId} from room ${roomId}`);
        this.players.delete(playerId);
        const room = this.gameRooms.get(roomId) || { players: [] };
        const remaining = room.players.filter(p => p.id !== playerId);
        if (remaining.length === 0) {
            this.gameRooms.delete(roomId);
        } else {
            room.players = remaining;
            this.gameRooms.set(roomId, room);
        }
    }

    startServer() {
        this.server.listen(this.port, () => console.log(`Game server running on port ${this.port}`));
    }

    broadcastToRoom(roomId, message) {
        const json = JSON.stringify(message);
        const room = this.gameRooms.get(roomId) || { players: [] };
        room.players.forEach(({ ws }) => {
            if (ws.readyState === 1) {
                ws.send(json);
            } else {
                console.log(`Failed to send to player ${ws.playerId} in room ${roomId}: WebSocket not open`);
            }
        });
    }
}