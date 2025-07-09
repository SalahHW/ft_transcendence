import WebSocket from 'ws';
import fs from 'fs';

// Si certificat auto-signé → ignorer les erreurs TLS (dev uniquement)
const socket = new WebSocket('wss://localhost:8443', {
  rejectUnauthorized: false // Ne pas utiliser en production
});

socket.on('open', () => {
  console.log('Connecté au serveur WSS');

  const data = {
    userId: 'user12',
    message: 'Hello depuis le client Node.js'
  };

  socket.send(JSON.stringify(data));
});

socket.on('message', (data) => {
  console.log('Message reçu du serveur :', data.toString());
});

socket.on('error', (err) => {
  console.error('Erreur WebSocket :', err.message);
});

socket.on('close', (code, reason) => {
  console.log(`Connexion fermée (code ${code})`);
});
