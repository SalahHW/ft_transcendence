// import { WebSocketServer } from "ws";
// import { PORT } from "./config/config.js";

// const wss = new WebSocketServer({ port: 8080 });

// // Tableau pour stocker les clients connectés
// const userConnectedArr = [];

// wss.on("connection", function connection(ws) {
//   ws.on("error", console.error);

//   ws.on("message", function message(data) {
//     const parsedData = JSON.parse(data.toString());
//     const { message, userId } = parsedData;

//     // Ajouter le client au tableau s'il n'existe pas déjà
//     if (!userConnectedArr.find(user => user.userId === userId)) {
//       userConnectedArr.push({
//         userId: userId,
//         ws: ws
//       });
//     }

//     console.log(`Client ${userId} connected`);
//     console.log("Clients connectés:", userConnectedArr.map(u => u.userId));
//   });


// ws.on("close", function close(code, reason) {
//     // Retirer le client du tableau lors de la déconnexion
//     const index = userConnectedArr.findIndex(user => user.ws === ws);
//     if (index !== -1) {
//       const disconnectedUser = userConnectedArr.splice(index, 1)[0];
//       console.log(`Client ${disconnectedUser.userId} déconnecté - Code: ${code}, Raison: ${reason}`);
//     }
//     console.log("Clients connectés restants:", userConnectedArr.map(u => u.userId));
//   });

//   // Ajouter le client au tableau
//   // Informer le client des connexions
//   ws.send(JSON.stringify({
//     type: "connection_success",
//     message: "Connexion réussie",
//     connectedUsers: userConnectedArr.map(u => u.userId)
//   }));
// });

// wss.on("close", function close() {
//   console.log("Un client s'est déconnecté");
// });

import fs from 'fs';
import https from 'https';
import { WebSocketServer } from 'ws';
import { PORT } from "./config/config.js";
// import dotenv from 'dotenv';
// dotenv.config();

// Charger les certificats
const serverOptions = {
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem'),
};

// Créer un serveur HTTPS
const httpsServer = https.createServer(serverOptions);

// Attacher un serveur WebSocket dessus
const wss = new WebSocketServer({ server: httpsServer });

const userConnectedArr = [];

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    const parsedData = JSON.parse(data.toString());
    const { message, userId } = parsedData;

    if (!userConnectedArr.find(user => user.userId === userId)) {
      userConnectedArr.push({ userId, ws });
    }

    console.log(`Client ${userId} connecté`);
    console.log('Clients connectés:', userConnectedArr.map(u => u.userId));
  });

  ws.on('close', function close(code, reason) {
    const index = userConnectedArr.findIndex(user => user.ws === ws);
    if (index !== -1) {
      const disconnectedUser = userConnectedArr.splice(index, 1)[0];
      console.log(`Client ${disconnectedUser.userId} déconnecté`);
    }
    console.log('Clients connectés restants:', userConnectedArr.map(u => u.userId));
  });

  ws.send(JSON.stringify({
    type: 'connection_success',
    message: 'Connexion sécurisée réussie',
    connectedUsers: userConnectedArr.map(u => u.userId)
  }));
});

// Démarrer le serveur HTTPS (et WSS par-dessus)
httpsServer.listen(8443, () => {
  console.log('Serveur WSS lancé sur wss://localhost:8443');
});
