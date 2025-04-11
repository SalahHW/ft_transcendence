# Projet : Suite de Contrats pour Jeu Pong et Tournois

---

## Table des matières

1. [Aperçu](#aperçu)  
2. [Contrats](#contrats)  
3. [Hardhat & Outils](#hardhat--outils)  
4. [Installation](#installation)  
5. [Tests & Couverture](#tests--couverture)  
6. [Déploiement](#déploiement)  
7. [Licence](#licence)  

---

## Aperçu

Ce dépôt propose une architecture complète pour :

- Gérer un jeton ERC20 servant de reward/pénalité (PongToken),  
- Définir des NFT (ERC721) pour symboliser un objet spécial (GoatNft) et des trophées de tournois (TournamentNft),  
- Piloter la logique centrale (MasterContract) : gestion des matchs, attribution/burn de tokens, transfert conditionnel du GoatNft, mint de TournamentNft, etc.

---

## Contrats

### 1. **GoatNft**

- Contrat ERC721 (NFT) représentant un unique token «Goat» (ID=299 minté au déploiement).  
- Transfert restreint via `_checkAuthorized(...)`, n’autorisant que l’owner du contrat.

### 2. **PongToken**

- Contrat ERC20 “PONG”.  
- `onlyOwner` sur `mint`/`burn` (ownership transférable, par ex. au MasterContract).  
- Sert à récompenser ou pénaliser les joueurs (gain/burn après un match).

### 3. **TournamentNft**

- Contrat ERC721 pour récompenser la victoire dans un tournoi.  
- `mintTnt(...)` : `onlyOwner`.  
- `_checkAuthorized(...)` limite aussi les transferts de ces NFT à l’owner du contrat (souvent le MasterContract).

### 4. **MasterContract**

- Contrat “chef d’orchestre” :  
  - `addPlayer(...)` : inscrit un joueur, mint initial de PongToken.  
  - `reportMatch(...)` : déclare un match, fait burn/mint de PongToken, transfère GoatNft si un joueur dépasse le solde du Goat holder.  
  - `reportTournament(...)` : minter un TournamentNft pour le vainqueur d’un tournoi.  
- Peut se voir transférer l’ownership des trois autres contrats (GoatNft, PongToken, TournamentNft) pour exécuter leurs fonctions `onlyOwner` de façon centralisée.

---

## Hardhat & Outils

**Hardhat** est un framework de développement pour Ethereum.  
- Il facilite la compilation de contrats, l’exécution de tests (Mocha + Chai), et le déploiement.  
- **Hardhat Test** : commande `npx hardhat test` qui exécute la suite Mocha de tests unitaires.  
- **Hardhat Coverage** : via le plugin [solidity-coverage](https://github.com/sc-forks/solidity-coverage), qui mesure la couverture du code Solidity (statements, branches, fonctions, lignes).

---

## Installation

1. **Installer** les dépendances (Hardhat, etc.) :  
   ```bash
   npm install
   ```
   ou  
   ```bash
   yarn
   ```

2. **Compiler** :  
   ```bash
   npx hardhat compile
   ```

---

## Tests & Couverture

- Pour exécuter les tests (Mocha/Chai) :  
  ```bash
  npx hardhat test
  ```
  Cela valide les fonctionnalités et les reverts attendus.

- Pour **générer** le rapport de couverture (grâce à `solidity-coverage`) :  
  ```bash
  npx hardhat coverage
  ```
  Le rapport indique quelles parties de votre code ont été exécutées par les tests.  

Une couverture **intégrale (100 %)** est attendue ; vous verrez un tableau semblable :

```
npx hardhat coverage

File                 |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
---------------------|----------|----------|----------|----------|----------------|
 contracts/          |      100 |      100 |      100 |      100 |                |
  MasterContract.sol |      100 |      100 |      100 |      100 |                |
 contracts/nfts/     |      100 |      100 |      100 |      100 |                |
  GoatNft.sol        |      100 |      100 |      100 |      100 |                |
  TournamentNft.sol  |      100 |      100 |      100 |      100 |                |
 contracts/tokens/   |      100 |      100 |      100 |      100 |                |
  PongToken.sol      |      100 |      100 |      100 |      100 |                |
---------------------|----------|----------|----------|----------|----------------|
All files            |      100 |      100 |      100 |      100 |                |
---------------------|----------|----------|----------|----------|----------------|
```

---

## Déploiement

Le projet est conçu pour être déployé en premier lieu sur un réseau **local**, afin de tester l’ensemble des fonctionnalités avant toute mise en ligne sur le **Fuji Testnet** (Avalanche).

### Déploiement local

1. **Démarrer le réseau local avec 20 comptes** :
```bash
npx hardhat node
```

2. **Dans un autre terminal**, exécuter le script d’interaction :
```bash
npx hardhat run scripts/interact.cjs --network localhost
```
Cela déploiera tous les contrats, transférera leur propriété au MasterContract, et lancera une séquence de tests : ajout de joueur, match, tournoi.

> 📝 Les adresses sont automatiquement sauvegardées dans `addresses.json` (créé si inexistant).

### Fuji (Avalanche Testnet)

> *À venir : configuration réseau + script de déploiement conditionnel pour Fuji.*
---
## API Fastify

L’API Fastify permet d’interagir avec le `MasterContract` sans toucher directement à Web3. Elle expose les fonctions du smart contract via des routes HTTP.

### 📍 Base URL : `http://localhost:3000`

### ▶️ POST `/add-player`
Ajoute un joueur au système, enregistre son nom et son adresse, puis lui envoie 100 PongTokens.

```json
{
  "name": "alice",
  "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
}
```

---

### ▶️ POST `/report-match`
Déclare un match, distribue les récompenses et met à jour l’état.

```json
{
  "player1": "alice",
  "player2": "bob",
  "matchId": 1,
  "player1Score": 10,
  "player2Score": 6,
  "winner": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
}x
```

---

### ▶️ POST `/report-tournament`
Déclare un tournoi terminé, minte un NFT pour le vainqueur.

```json
{
  "endTimestamp": 1712345678,
  "matchIds": [1],
  "winner": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
}
```

---

### ▶️ GET `/player/:name`  
Renvoie l’adresse Ethereum liée au nom du joueur.

### ▶️ GET `/match/player/:name`  
Liste les matchs où le joueur a participé.

### ▶️ GET `/match/winner/:address`  
Liste les matchs remportés par une adresse.

### ▶️ GET `/match/:id`  
Renvoie les détails d’un match via son ID.

### ▶️ GET `/tournament/:id`  
Renvoie les détails d’un tournoi par ID.

### ▶️ GET `/tournament/winner/:address`  
Liste tous les tournois gagnés par une adresse donnée.

### ▶️ GET `/nft/goat/299`
Renvoie l'addresse du propriétaire du GOAT nft.

### ▶️ GET `/nft/tournament/:tournamentId`
Renvoie l'addresse du propriétaire du nft lié au tournoi en question.

---

### 🐳 Scripts intégrés au conteneur :

- Démarrage de Hardhat local sur `localhost:3001`
- Compilation automatique des contrats
- Déploiement conditionnel des contrats (`scripts/deploy.cjs`)
- Exportation des ABIs (`scripts/exportAbis.cjs`)
- Lancement du serveur Fastify (`backend-blockchain/server.js`)
- Lancement du projet final (`start.cjs`) via `npm run start`

---

## Licence

Ce projet est sous licence **MIT** ou équivalente. Consultez le fichier `LICENSE` pour plus d’informations.

---

