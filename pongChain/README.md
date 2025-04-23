# PongChain – Système Complet de Jeu et Tournois sur Blockchain

## 🔍 Introduction

PongChain est une suite de contrats intelligents développés en Solidity, destinés à gérer un écosystème de jeu compétitif basé sur des matchs de Pong et des tournois. L'infrastructure repose sur quatre contrats : GoatNft, PongToken, TournamentNft et MasterContract. Un backend Fastify expose ces fonctionnalités via une API REST pour une intégration facilitée.

## ⚙️ Fonctionnalités principales

- Jeton ERC20 utilisé pour les récompenses et pénalités (PongToken)
- NFT ERC721 pour trophées de tournoi et possession GOAT (GoatNft, TournamentNft)
- Contrat central (MasterContract) pour piloter les actions : matchs, tournois, mint/burn, transferts conditionnels
- API Fastify exposant les méthodes du contrat

## 💼 Contrats

### GoatNft (ERC721)
- NFT unique avec ID 299 minté au déploiement
- Transfert réservé à l’owner via _checkAuthorized()

### PongToken (ERC20)
- Jeton utilitaire "PONG"
- mint et burn protégés par onlyOwner
- Transfert possible de l’ownership au MasterContract

### TournamentNft (ERC721)
- NFT à usage unique pour chaque tournoi gagné
- Mint limité au owner (souvent MasterContract)

### MasterContract
- Point d’entrée unique pour toute la logique du jeu
- addPlayer : enregistre un joueur et lui attribue des tokens
- reportMatch : traite un match, récompense le gagnant, transfère GoatNft si applicable
- reportTournament : mint un NFT pour le gagnant

## 🤖 Backend API Fastify

### URL de base : http://localhost:${PORT}

#### POST /add-player
Ajoute un joueur et lui attribue 100 PONG

Body :
{
  "name": "alice",
  "address": "0x..."
}

#### POST /report-match
Déclare un match

Body :
{
  "player1": "alice",
  "player2": "bob",
  "matchId": 1,
  "player1Score": 10,
  "player2Score": 6,
  "winner": "0x..."
}

#### POST /report-tournament
Finalise un tournoi

Body :
{
  "endTimestamp": 1712345678,
  "matchIds": [1],
  "winner": "0x...",
  "tournamentTokenIds": 1
}

#### GET /player/:name
Renvoie l'adresse du joueur

#### GET /match/player/:name
Matchs joués par le joueur

#### GET /match/winner/:address
Matchs gagnés par adresse

#### GET /match/:id
Détails d’un match

#### GET /tournament/:id
Détails d’un tournoi

#### GET /tournament/winner/:address
Tournois remportés par l’adresse

#### GET /nft/goat/299
Propriétaire actuel du GoatNft

#### GET /nft/tournament/:tournamentId
Propriétaire du NFT de tournoi

## 📖 Documentation Swagger

Le service expose une documentation Swagger interactive sur :
```
http://localhost:${PORT}/docs
```

Cette page vous permet de tester toutes les routes et d'explorer les schémas d'entrée et de sortie.

Swagger est intégré via `@fastify/swagger` et `@fastify/swagger-ui`. Il lit les métadonnées (schemas) directement définies dans les routes.

## 🚀 Déploiement

### Déploiement local

npx hardhat node

npx hardhat run scripts/interact.cjs --network localhost

Les adresses sont stockées dans addresses.json

### Déploiement Fuji (Avalanche Testnet)
WIP : script de déploiement conditionnel + configuration réseau

## 📚 Tests & Couverture

Lancer tous les tests :
npx hardhat test

Rapport de couverture :
npx hardhat coverage

Objectif : couverture 100% (statements, branches, fonctions, lignes)

## 📁 Structure du projet

project-root/
├── contracts/
│   ├── MasterContract.sol
│   ├── nfts/
│   │   ├── GoatNft.sol
│   │   └── TournamentNft.sol
│   └── tokens/
│       └── PongToken.sol
├── scripts/
│   ├── interact.cjs
│   ├── deploy.cjs
│   └── exportAbis.cjs
├── backend-blockchain/
│   ├── server.js
│   └── routes/
├── addresses.json
├── start.cjs
└── hardhat.config.js

## 🛠️ Lancement complet avec Docker

Compilation + déploiement local + export ABIs + lancement serveur Fastify :
npm run start

Intégré dans l'image Docker avec Makefile supportant make all et make clean

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus d’informations.
