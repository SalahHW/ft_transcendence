import fs from "fs";
import https from "https";
import http from "http";
import { WebSocketServer } from "ws";
import { isDev, PORT } from "./config/config.js";

class Client {
  constructor(userId, ws) {
    this.userId = userId;
    this.ws = ws;
    this.connectedAt = Date.now();
    this.lastActivity = Date.now();
  }

  isConnected() {
    return this.ws.readyState === this.ws.OPEN;
  }

  send(message) {
    if (this.isConnected()) {
      try {
        this.ws.send(JSON.stringify(message));
        this.updateActivity();
        return true;
      } catch (error) {
        if (isDev)
          console.error(
            `Failed to send message to user ${this.userId}:`,
            error
          );
        return false;
      }
    }
    return false;
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  getPublicInfo() {
    return {
      userId: this.userId,
      connectedAt: this.connectedAt,
      lastActivity: this.lastActivity,
    };
  }
}

let server;

if (isDev) {
  server = http.createServer();
  if (isDev) console.log(`Development mode: using HTTP server`);
} else {
  const serverOptions = {
    key: fs.readFileSync("./ssl/privkey.pem"),
    cert: fs.readFileSync("./ssl/fullchain.pem"),
  };
  server = https.createServer(serverOptions);
}

const wss = new WebSocketServer({ server });

// Clients array
const connectedClients = [];

wss.on("connection", function connection(ws) {
  ws.on("error", console.error);

  ws.on("message", function message(data) {
    const parsedData = JSON.parse(data.toString());
    const { message, userId } = parsedData;

    const existingClient = connectedClients.find(
      (client) => client.userId === userId
    );

    if (!existingClient) {
      const client = new Client(userId, ws);
      connectedClients.push(client);

      if (isDev) {
        console.log(`Client ${userId} connected`);
        console.log(
          "Clients connected:",
          connectedClients.map((c) => c.userId)
        );
      }
      broadcastConnection(client);
    } else {
      existingClient.updateActivity();
    }
  });

  ws.on("close", function close(code, reason) {
    const index = connectedClients.findIndex((client) => client.ws === ws);

    if (index !== -1) {
      const disconnectedClient = connectedClients.splice(index, 1)[0];

      if (isDev)
        console.log(`Client ${disconnectedClient.userId} disconnected`);

      broadcastDisconnection(disconnectedClient);

      if (isDev) {
        console.log(
          "Clients connected remaining:",
          connectedClients.map((c) => c.userId)
        );
      }
    }
  });

  const payload = {
    type: "connection_success",
    message: "Secure connection success",
    connectedUsers: connectedClients.map((c) => c.userId),
    timestamp: Date.now(),
  };

  ws.send(JSON.stringify(payload));
});

function broadcastDisconnection(disconnectedClient) {
  const message = {
    type: "user_disconnected",
    userId: disconnectedClient.userId,
    connectedUsers: connectedClients.map((c) => c.userId),
    userInfo: disconnectedClient.getPublicInfo(),
    timestamp: Date.now(),
  };

  let successCount = 0;

  for (const client of connectedClients) {
    if (client.send(message)) {
      successCount++;
    }
  }

  if (isDev) {
    console.log(
      `Broadcasted disconnection of user ${disconnectedClient.userId} to ${successCount}/${connectedClients.length} clients`
    );
  }
}

function broadcastConnection(newClient) {
  const message = {
    type: "user_connected",
    userId: newClient.userId,
    connectedUsers: connectedClients.map((c) => c.userId),
    userInfo: newClient.getPublicInfo(),
    timestamp: Date.now(),
  };

  let successCount = 0;
  let totalOtherClients = 0;

  for (const client of connectedClients) {
    if (client.userId !== newClient.userId) {
      totalOtherClients++;
      if (client.send(message)) {
        successCount++;
      }
    }
  }

  if (isDev) {
    console.log(
      `Broadcasted connection of user ${newClient.userId} to ${successCount}/${totalOtherClients} clients`
    );
  }
}

server.listen(PORT, () => {
  const protocol = isDev ? "ws" : "wss";
  if (isDev)
    console.log(`WebSocket server running on ${protocol}://localhost:${PORT}`);
});
