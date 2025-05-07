import { webSocketGameServer } from '../webSockets/webSocketServer.js';

// Start the WebSocket server
const wsServer = new webSocketGameServer(8080);