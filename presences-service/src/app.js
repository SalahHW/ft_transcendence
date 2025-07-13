import fs from "fs";
import https from "https";
import http from "http";
import { WebSocketServer } from "ws";
import { isDev, logs, PORT } from "./config/config.js";

class Client {
  constructor(userId, ws) {
    this.userId = userId;
    this.ws = ws;
    this.connectedAt = Date.now();
    this.lastActivity = Date.now();
  }

  send(message) {
    if (this.ws.readyState === this.ws.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        this.lastActivity = Date.now();
        return true;
      } catch (error) {
        if (isDev || logs)
          console.error(
            `Failed to send message to user ${this.userId}:`,
            error
          );
        return false;
      }
    }
    return false;
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
  if (isDev || logs) console.log(`Development mode: using HTTP server`);
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

function handleMessage(data, ws) {
  try {
    const parsedData = JSON.parse(data.toString());
    const { userId } = parsedData;

    const existingClient = connectedClients.find(
      (client) => client.userId === userId
    );
    if (!existingClient) {
      const client = new Client(userId, ws);
      connectedClients.push(client);

      if (isDev || logs) {
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
  } catch (err) {}
}

wss.on("connection", function connection(ws) {
  ws.on("error", console.error);

  ws.on("message", function (data) {
    handleMessage(data, ws);
  });

  ws.on("close", function close(code, reason) {
    const index = connectedClients.findIndex((client) => client.ws === ws);

    if (index !== -1) {
      const disconnectedClient = connectedClients.splice(index, 1)[0];

      if (isDev || logs)
        console.log(`Client ${disconnectedClient.userId} disconnected`);

      broadcastDisconnection(disconnectedClient);

      if (isDev || logs) {
        console.log(
          "Clients connected remaining:",
          connectedClients.map((c) => c.userId)
        );
      }
    }
  });
});

function broadcastDisconnection(disconnectedClient) {
  const message = {
    type: "user_disconnected",
    userId: disconnectedClient.userId,
    connectedUsers: connectedClients.map((c) => c.userId),
    userInfo: disconnectedClient.getPublicInfo(),
  };

  for (const client of connectedClients) {
    client.send(message);
  }

  if (isDev || logs) {
    console.log(
      `Broadcasted disconnection of user ${disconnectedClient.userId} to other clients`
    );
  }
}

function broadcastConnection(newClient) {
  const message = {
    type: "user_connected",
    userId: newClient.userId,
    connectedUsers: connectedClients.map((c) => c.userId),
    userInfo: newClient.getPublicInfo(),
  };

  let totalOtherClients = 0;

  for (const client of connectedClients) {
    if (client.userId !== newClient.userId) {
      totalOtherClients++;
      client.send(message);
    }
  }

  const confirmationMessage = {
    type: "connection_success",
    connectedUsers: connectedClients.map((c) => c.userId),
    yourUserId: newClient.userId,
  };
  newClient.send(confirmationMessage);

  if (isDev || logs) {
    console.log(
      `Broadcasted connection of user ${newClient.userId} to other clients`
    );
  }
}

server.listen(PORT, () => {
  const protocol = isDev ? "ws" : "wss";
  if (isDev || logs)
    console.log(`WebSocket server running on ${protocol}://localhost:${PORT}`);
});