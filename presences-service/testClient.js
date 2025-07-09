// const socket = new WebSocket("ws://localhost:443");

// socket.addEventListener("open", () => {
//   const data = { type: "message", content: "Hello from Node.js!" };
//   socket.send(JSON.stringify(data));
// });

// socket.addEventListener("message", (event) => {
//   try {
//     const receivedData = event.data;
//     console.log("Received:", receivedData);
//   } catch (error) {
//     console.error("Error parsing JSON:", error);
//     console.log("Received data was:", event.data);
//   }
// });

import WebSocket from 'ws';
import fs from 'fs';

// Si certificat auto-signé → ignorer les erreurs TLS (dev uniquement)
const socket = new WebSocket('wss://localhost:8443', {
  rejectUnauthorized: false // ⚠️ Ne pas utiliser en production
});

socket.on('open', () => {
  console.log('✅ Connecté au serveur WSS');

  const data = {
    userId: 'user123',
    message: 'Hello depuis le client Node.js'
  };

  socket.send(JSON.stringify(data));
});

socket.on('message', (data) => {
  console.log('📨 Message reçu du serveur :', data.toString());
});

socket.on('error', (err) => {
  console.error('❌ Erreur WebSocket :', err.message);
});

socket.on('close', (code, reason) => {
  console.log(`❎ Connexion fermée (code ${code})`);
});
