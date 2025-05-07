//import { WebSocketServer } from 'ws';
//import { v4 as uuidv4 } from 'uuid';
//import https from 'https';
//import fs from 'fs';
//
//export class webSocketGameServer {
//  constructor(port = 8080) {
//    this.serverConfig = this.loadSecurityConfig();
//    this.server = this.createHttpsServer();
//    this.webSocketServer = this.initializeWebSocketServer();
//    this.gameRooms = new Map();
//    this.players = new Map();
//    this.setupConnectionHandlers();
//    this.startServer(port);
//    this.startGameLoop();
//  }
//
//  loadSecurityConfig() {
//    return {
//      cert: fs.readFileSync('src/server/certs/cert.pem'),
//      key: fs.readFileSync('src/server/certs/key.pem'),
//    };
//  }
//
//  createHttpsServer() {
//    return https.createServer(this.serverConfig, (req, res) => {
//      res.writeHead(200, { 'Content-Type': 'text/plain' });
//      res.end('WebSocket server is running\n');
//    });
//  }
//
//  initializeWebSocketServer() {
//    return new WebSocketServer({ server: this.server });
//  }
//
//  setupConnectionHandlers() {
//    this.webSocketServer.on('connection', (ws) => {
//      this.handleNewPlayerConnection(ws);
//    });
//  }
//
//  handleNewPlayerConnection(ws) {
//    const newPlayer = this.createNewPlayer(ws);
//    this.players.set(newPlayer.id, newPlayer);
//
//    const assignedRoom = this.findOrCreateGameRoomForPlayer(newPlayer);
//    this.setupPlayerConnectionMetadata(ws, newPlayer.id, assignedRoom);
//    this.logPlayerConnection(newPlayer.id, assignedRoom);
//
//    const roomPlayers = this.gameRooms.get(assignedRoom);
//    if (roomPlayers.length === 2) {
//      this.notifyPlayersGameStart(roomPlayers, assignedRoom);
//    }
//
//    ws.on('message', (data) => this.handlePlayerInput(data, newPlayer.id, assignedRoom));
//    ws.on('close', () => this.handlePlayerDisconnect(newPlayer.id, assignedRoom));
//  }
//
//  createNewPlayer(ws) {
//    return {
//      ws,
//      id: uuidv4(),
//      positionZ: 0,
//      isUpPressed: false,
//      isDownPressed: false,
//    };
//  }
//
//  findOrCreateGameRoomForPlayer(player) {
//    for (const [roomId, players] of this.gameRooms.entries()) {
//      if (players.length < 2) {
//        players.push(player);
//        return roomId;
//      }
//    }
//    const newRoomId = uuidv4();
//    this.gameRooms.set(newRoomId, [player]);
//    return newRoomId;
//  }
//
//  setupPlayerConnectionMetadata(ws, playerId, roomId) {
//    ws.playerId = playerId;
//    ws.roomId = roomId;
//  }
//
//  logPlayerConnection(playerId, roomId) {
//    console.log(`Player connected: ${playerId} in room ${roomId}`);
//  }
//
//  notifyPlayersGameStart(players, roomId) {
//    players.forEach((player, i) => {
//      const otherPlayer = players[1 - i];
//      player.ws.send(JSON.stringify({
//        type: 'init',
//        playerId: player.id,
//        roomId,
//        role: i,
//        opponentId: otherPlayer.id,
//      }));
//    });
//  }
//
//  handlePlayerInput(data, playerId, roomId) {
//    let msg;
//    try {
//      msg = JSON.parse(data);
//    } catch (e) {
//      return console.error('Bad JSON:', e);
//    }
//
//    const player = this.players.get(playerId);
//    const roomPlayers = this.gameRooms.get(roomId) || [];
//    if (roomPlayers.length !== 2) return;
//
//    if (msg.type === 'keyDown') {
//      if (msg.direction === 'up') {
//        player.isUpPressed = true;
//      } else if (msg.direction === 'down') {
//        player.isDownPressed = true;
//      }
//    } else if (msg.type === 'keyUp') {
//      if (msg.direction === 'up') {
//        player.isUpPressed = false;
//      } else if (msg.direction === 'down') {
//        player.isDownPressed = false;
//      }
//    }
//  }
//
//  startGameLoop() {
//    const FPS = 120;
//    const BROADCAST_FPS = 60;
//    let lastBroadcast = Date.now();
//    const update = () => {
//      const deltaTime = 1 / FPS;
//      this.players.forEach((player, playerId) => {
//        const room = this.gameRooms.get(player.ws.roomId);
//        if (!room || room.length !== 2) {
//          console.log(`Skipping update for player ${playerId}: invalid room ${player.ws.roomId}`);
//          return;
//        }
//
//        const speed = 10; // units/s, matches client
//        const halfD = 7.5; // Matches client bounds
//
//        let moved = false;
//        if (player.isUpPressed && !player.isDownPressed) {
//          const newZ = player.positionZ - speed * deltaTime;
//          player.positionZ = Math.max(-halfD, newZ);
//          moved = newZ !== player.positionZ; // Moved if clamped
//        } else if (player.isDownPressed && !player.isUpPressed) {
//          const newZ = player.positionZ + speed * deltaTime;
//          player.positionZ = Math.min(halfD, newZ);
//          moved = newZ !== player.positionZ; // Moved if clamped
//        }
//
//        const now = Date.now();
//        // Broadcast if key is pressed, even if positionZ didn't change
//        if ((player.isUpPressed || player.isDownPressed) && now - lastBroadcast >= 1000 / BROADCAST_FPS) {
//          console.log(`Broadcasting paddleMove for player ${playerId} in room ${player.ws.roomId}, positionZ: ${player.positionZ}${moved ? ' (moved)' : ' (key pressed)'}`);
//          this.broadcastToRoom(player.ws.roomId, {
//            type: 'paddleMove',
//            playerId,
//            positionZ: player.positionZ,
//          });
//          lastBroadcast = now;
//        }
//      });
//
//      setTimeout(update, 1000 / FPS);
//    };
//    update();
//  }
//
//  handlePlayerDisconnect(playerId, roomId) {
//    console.log(`Player disconnected: ${playerId} from room ${roomId}`);
//    this.players.delete(playerId);
//
//    const remaining = (this.gameRooms.get(roomId) || []).filter(p => p.id !== playerId);
//    if (remaining.length === 0) {
//      this.gameRooms.delete(roomId);
//    } else {
//      this.gameRooms.set(roomId, remaining);
//    }
//  }
//
//  startServer(port) {
//    this.server.listen(port, () => console.log(`Game server running on port ${port}`));
//  }
//
//  broadcastToRoom(roomId, message) {
//    const json = JSON.stringify(message);
//    const room = this.gameRooms.get(roomId) || [];
//    room.forEach(({ ws }) => {
//      if (ws.readyState === 1) {
//        ws.send(json);
//      } else {
//        console.log(`Failed to send to player in room ${roomId}: WebSocket not open`);
//      }
//    });
//  }
//}

import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';
import fs from 'fs';

export class webSocketGameServer {
  constructor(port = 8080) {
    this.serverConfig = this.loadSecurityConfig();
    this.server = this.createHttpsServer();
    this.webSocketServer = this.initializeWebSocketServer();
    this.gameRooms = new Map();
    this.players = new Map();
    this.setupConnectionHandlers();
    this.startServer(port);
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

    const roomPlayers = this.gameRooms.get(assignedRoom);
    if (roomPlayers.length === 2) {
      this.notifyPlayersGameStart(roomPlayers, assignedRoom);
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
    };
  }

  findOrCreateGameRoomForPlayer(player) {
    for (const [roomId, players] of this.gameRooms.entries()) {
      if (players.length < 2) {
        players.push(player);
        return roomId;
      }
    }
    const newRoomId = uuidv4();
    this.gameRooms.set(newRoomId, [player]);
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

  handlePlayerInput(data, playerId, roomId) {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      return console.error('Bad JSON:', e);
    }

    const player = this.players.get(playerId);
    const roomPlayers = this.gameRooms.get(roomId) || [];
    if (roomPlayers.length !== 2) return;

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
    }
  }

  startGameLoop() {
    const FPS = 120;
    const BROADCAST_FPS = 60;
    const SYNC_INTERVAL = 100; // Sync every 500ms
    let lastBroadcast = Date.now();
    let lastSync = Date.now();

    const update = () => {
      const now = Date.now();
      const deltaTime = 1 / FPS;

      // Update player positions
      this.players.forEach((player, playerId) => {
        const room = this.gameRooms.get(player.ws.roomId);
        if (!room || room.length !== 2) {
          console.log(`Skipping update for player ${playerId}: invalid room ${player.ws.roomId}`);
          return;
        }

        const speed = 10; // units/s, matches client
        const halfD = 7.5; // Matches client bounds

        let moved = false;
        if (player.isUpPressed && !player.isDownPressed) {
          const newZ = player.positionZ - speed * deltaTime;
          player.positionZ = Math.max(-halfD, newZ);
          moved = newZ !== player.positionZ; // Moved if clamped
        } else if (player.isDownPressed && !player.isUpPressed) {
          const newZ = player.positionZ + speed * deltaTime;
          player.positionZ = Math.min(halfD, newZ);
          moved = newZ !== player.positionZ; // Moved if clamped
        }
        // Round positionZ to 3 decimal places to avoid floating-point issues
        player.positionZ = Number(player.positionZ.toFixed(3));

        // Broadcast paddleMove if key is pressed
        if ((player.isUpPressed || player.isDownPressed) && now - lastBroadcast >= 1000 / BROADCAST_FPS) {
          console.log(`Broadcasting paddleMove for player ${playerId} in room ${player.ws.roomId}, positionZ: ${player.positionZ}${moved ? ' (moved)' : ' (key pressed)'}`);
          this.broadcastToRoom(player.ws.roomId, {
            type: 'paddleMove',
            playerId,
            positionZ: player.positionZ,
          });
          lastBroadcast = now;
        }
      });

      // Send periodic sync message
      if (now - lastSync >= SYNC_INTERVAL) {
        this.gameRooms.forEach((players, roomId) => {
          if (players.length === 2) {
            const playerPositions = {};
            players.forEach(player => {
              playerPositions[player.id] = player.positionZ;
            });
            console.log(`Broadcasting sync for room ${roomId}:`, playerPositions);
            this.broadcastToRoom(roomId, {
              type: 'sync',
              playerPositions,
            });
          }
        });
        lastSync = now;
      }

      setTimeout(update, 1000 / FPS);
    };
    update();
  }

  handlePlayerDisconnect(playerId, roomId) {
    console.log(`Player disconnected: ${playerId} from room ${roomId}`);
    this.players.delete(playerId);

    const remaining = (this.gameRooms.get(roomId) || []).filter(p => p.id !== playerId);
    if (remaining.length === 0) {
      this.gameRooms.delete(roomId);
    } else {
      this.gameRooms.set(roomId, remaining);
    }
  }

  startServer(port) {
    this.server.listen(port, () => console.log(`Game server running on port ${port}`));
  }

  broadcastToRoom(roomId, message) {
    const json = JSON.stringify(message);
    const room = this.gameRooms.get(roomId) || [];
    room.forEach(({ ws }) => {
      if (ws.readyState === 1) {
        ws.send(json);
      } else {
        console.log(`Failed to send to player in room ${roomId}: WebSocket not open`);
      }
    });
  }
}