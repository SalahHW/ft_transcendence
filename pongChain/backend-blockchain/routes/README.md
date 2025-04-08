👀 Blockchain Backend – API Fastify pour MasterContract

Ce projet expose une API HTTP basée sur Fastify (Node.js), permettant d’interagir avec un contrat intelligent principal (MasterContract) déployé sur la blockchain (Avalanche C-Chain, ou autre EVM-compatible).

🧱 Architecture

backend-blockchain/
├── abi/                    ← Fichier ABI du contrat MasterContract
│   └── ContractABI.json
├── routes/                 ← Dossier contenant les routes Fastify
│   ├── addPlayer.js        ← Route POST /add-player
│   ├── reportMatch.js      ← Route POST /report-match
│   ├── reportTournament.js ← Route POST /report-tournament
│   ├── getPlayer.js        ← Route GET /player/:name
│   ├── getMatchByPlayer.js← Route GET /match/player/:name
│   ├── getMatchByWinner.js← Route GET /match/winner/:address
│   ├── getMatchById.js     ← Route GET /match/:id
│   ├── getTournamentById.js← Route GET /tournament/:id
│   └── getTournamentByWinner.js ← Route GET /tournament/winner/:address
├── .env                    ← Variables d’environnement (clé privée, RPC, etc.)
├── index.js                ← Point d’entrée du serveur
└── README.md               ← Documentation

🚀 Démarrage rapide

1. Installer les dépendances

npm install

2. Créer un fichier .env

PRIVATE_KEY=0x...votre_clé_privée...
RPC_URL=https://api.avax.network/ext/bc/C/rpc
CONTRACT_ADDRESS=0x...adresse_du_contrat_MasterContract...

⚠️ Ne versionnez jamais ce fichier. Ajoutez-le à .gitignore.

3. Fournir l’ABI

Copiez l’ABI de votre contrat dans abi/ContractABI.json.

4. Lancer le serveur

node index.js

📌 Routes disponibles

POST /add-player

Ajoute un joueur à la blockchain via MasterContract.addPlayer.

Requête :

{
  "name": "Platon",
  "address": "0x1234567890abcdef1234567890abcdef12345678"
}

Réponse :

{
  "success": true,
  "transactionHash": "0x..."
}

POST /report-match

Rapporte un match via MasterContract.reportMatch.

Requête :

{
  "player1": "Platon",
  "player2": "Aristote",
  "matchId": 1,
  "player1Score": 5,
  "player2Score": 3,
  "winner": "0x...winnerAddress"
}

POST /report-tournament

Rapporte un tournoi via MasterContract.reportTournament.

Requête :

{
  "endTimestamp": 1712451200,
  "matchIds": [1, 2, 3],
  "winner": "0x...winnerAddress"
}

GET /player/:name

Retourne l’adresse du joueur enregistré par nom.

GET /match/player/:name

Retourne les matchs joués par un joueur donné.

GET /match/winner/:address

Retourne les matchs gagnés par l’adresse donnée.

GET /match/:id

Retourne les détails du match avec l’identifiant donné.

GET /tournament/:id

Retourne les détails d’un tournoi par identifiant.

GET /tournament/winner/:address

Retourne les tournois gagnés par une adresse donnée.

👨‍💻 Technologies utilisées

Node.js

Fastify

Ethers.js

Solidity (MasterContract)