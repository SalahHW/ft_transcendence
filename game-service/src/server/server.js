import { webSocketGameServer } from '../webSockets/webSocketServer.js';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.GAME_SERVICE_PORT || 8080;
const wsServer = new webSocketGameServer(port);