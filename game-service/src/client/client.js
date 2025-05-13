// Import player paddle logic, game map rendering, and WebSocket client
import { playerPaddle } from '/src/player/player.js';
import { gameMap } from '/src/map/gameMap.js';
import { webSocketClient } from '/src/webSockets/webSocketClient.js';
import '/src/style.css'; // Import game styles

// Initialize a WebSocket client to connect to the secure WebSocket server
const clientConnection = new webSocketClient('wss://localhost:8080');

// Game state variables
let map = null;
let player1, player2;
let roomId = null;
let localPlayerId = null;
let isUpPressed = false;
let isDownPressed = false;

// Wait for the HTML document to fully load before initializing game logic
document.addEventListener('DOMContentLoaded', () => {
  // Register an "init" handler to configure the game after server assigns role
  clientConnection.onInit(async ({ playerId, roomId: rId, role, opponentId }) => {
    roomId = rId; // Save assigned room ID
    localPlayerId = playerId; // Save local player's ID
    console.log(`Initialized player ${playerId} in room ${roomId}, role: ${role}`);

    // Create and configure the game map and playground
    map = new gameMap();
    map.createMap();
    map.createPlayground();

    // Create local and opponent paddles with correct playerId and role
    if (role === 0) {
      player1 = new playerPaddle('Player1', playerId, 0);      // local player, role 0 (blue)
      player2 = new playerPaddle('Player2', opponentId, 1);    // opponent, role 1 (red)
    } else {
      player1 = new playerPaddle('Player1', opponentId, 0);    // opponent, role 0 (blue)
      player2 = new playerPaddle('Player2', playerId, 1);      // local player, role 1 (red)
    }

    // Add paddles to the scene at fixed X-positions and same Y/Z
    player1.createPaddle(map.getScene, 19.5, 2, 20);  // Right side, speed 20 units/s
    player2.createPaddle(map.getScene, -19.5, 2, 20); // Left side, speed 20 units/s

    console.log(`P1 ID = ${player1.getPlayerId()} (role=${player1.role}, local=${player1.getPlayerId() === localPlayerId}), P2 ID = ${player2.getPlayerId()} (role=${player2.role}, local=${player2.getPlayerId() === localPlayerId})`);

    // Start the render loop for the Babylon.js engine
    map.getEngine.runRenderLoop(() => {
      // Update local player paddle position for smooth movement
      const localPlayer = player1.getPlayerId() === localPlayerId ? player1 : player2;
      if (isUpPressed && !isDownPressed) {
        localPlayer.move(-1, map.getEngine.getDeltaTime() / 1000); // Move up
        //console.log(`Moved local player ${localPlayer.getPlayerId()} up, z=${localPlayer.getPaddleBodyPos.z}`);
        clientConnection.send({
          type: 'paddlePosition',
          playerId: localPlayerId,
          positionZ: localPlayer.getPaddleBodyPos.z,
        });
      } else if (isDownPressed && !isUpPressed) {
        localPlayer.move(1, map.getEngine.getDeltaTime() / 1000); // Move down
        //console.log(`Moved local player ${localPlayer.getPlayerId()} down, z=${localPlayer.getPaddleBodyPos.z}`);
        clientConnection.send({
          type: 'paddlePosition',
          playerId: localPlayerId,
          positionZ: localPlayer.getPaddleBodyPos.z,
        });
      }
      map.getScene.render();
    });

    // Handle canvas resizing to fit window dynamically
    window.addEventListener('resize', () => map.getEngine.resize());

    // Play match intro animation
    await map.launchMatchAnimation();

    // Listen for paddleMove updates from server
    clientConnection.onPaddleMove(({ playerId: pid, positionZ }) => {
      //console.log(`Received paddleMove for player ${pid}, positionZ: ${positionZ}`);
      // Skip updating local player (client-side prediction handles it)
      if (pid === localPlayerId) {
        //console.log(`Skipping update for local player ${pid}`);
        return;
      }
      if (player1.getPlayerId() === pid) {
        //console.log(`Updating player1 (P1 ID = ${player1.getPlayerId()}) to z=${positionZ}`);
        player1.setZ(positionZ);
      } else if (player2.getPlayerId() === pid) {
        //console.log(`Updating player2 (P2 ID = ${player2.getPlayerId()}) to z=${positionZ}`);
        player2.setZ(positionZ);
      } else {
        //console.log(`No matching player for ID ${pid} (P1 ID = ${player1.getPlayerId()}, P2 ID = ${player2.getPlayerId()})`);
      }
    });

    // Listen for sync updates from server
    clientConnection.onSync(({ playerPositions }) => {
      //console.log(`Received sync:`, playerPositions);
      Object.entries(playerPositions).forEach(([pid, positionZ]) => {
        if (player1.getPlayerId() === pid) {
          if (pid === localPlayerId) {
            const currentZ = player1.getPaddleBodyPos.z;
            const diff = Math.abs(positionZ - currentZ);
            if (diff > 0.1) {
              //console.log(`Syncing local player1 (P1 ID = ${pid}) to z=${positionZ}, was z=${currentZ}, diff=${diff}`);
              player1.setZ(positionZ);
            } else {
              //console.log(`Skipping sync for local player1 (P1 ID = ${pid}), z=${currentZ}, server z=${positionZ}, diff=${diff}`);
            }
          } else {
            //console.log(`Syncing opponent player1 (P1 ID = ${pid}) to z=${positionZ}`);
            player1.setZ(positionZ);
          }
        } else if (player2.getPlayerId() === pid) {
          if (pid === localPlayerId) {
            const currentZ = player2.getPaddleBodyPos.z;
            const diff = Math.abs(positionZ - currentZ);
            if (diff > 0.1) {
              //console.log(`Syncing local player2 (P2 ID = ${pid}) to z=${positionZ}, was z=${currentZ}, diff=${diff}`);
              player2.setZ(positionZ);
            } else {
              //console.log(`Skipping sync for local player2 (P2 ID = ${pid}), z=${currentZ}, server z=${positionZ}, diff=${diff}`);
            }
          } else {
            //console.log(`Syncing opponent player2 (P2 ID = ${pid}) to z=${positionZ}`);
            player2.setZ(positionZ);
          }
        } else {
          //console.log(`No matching player for sync ID ${pid}`);
        }
      });
    });

    // Handle key input and send keyDown/keyUp to server
    document.addEventListener('keydown', (event) => {
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