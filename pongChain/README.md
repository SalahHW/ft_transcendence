# Cahier des Charges – Projet Blockchain Pong

## 📌 Objectif
Créer une plateforme blockchain dédiée au jeu Pong avec des tokens (PONG), des NFTs, et un système de gestion complet via un contrat maître (`MasterContract`).

## 📂 Structure du dossier `contracts`

```
contracts/
├── MasterContract.sol
├── managers/
│   ├── MatchManager.sol
│   └── TournamentManager.sol
├── nfts/
│   ├── GoatNft.sol
│   └── TournamentNft.sol
└── tokens/
    └── PongToken.sol
```

## 📋 Contrats et Attributs

### 🔹 MasterContract
**Attributs :**
- `mapping(string => address) public players;`
- `mapping(uint256 => Match) public matches;`
- `mapping(uint256 => uint256) public tournamentIds;`
- `uint256 public tournamentTokenId;`

### Struct :
```solidity
struct Match {
  address player1;
  address player2;
  address winner;
  uint256 timestamp;
}
```

### Fonctions :
- **addPlayer**
  ```solidity
  function addPlayer(string memory name, address player) external onlyOwner;
  ```
  Ajoute un joueur et lui assigne des tokens.

- **getPlayerAddress**
  ```solidity
  function getPlayerAddress(string memory name) public view returns (address) onlyOwner;
  ```
  Retourne l'adresse Ethereum associée au joueur.

- **mintTokens**
  ```solidity
  function mintTokens(address player, uint256 amount) external onlyOwner;
  ```
  Mint des tokens (PONG) pour un joueur spécifique.

- **reportMatch**
  ```solidity
  function reportMatch(uint256 matchId, string memory player1, string memory player2, address winner) external onlyOwner;
  ```
  Enregistre les résultats d'un match et effectue les transferts de tokens.

- **mintTournamentNft**
  ```solidity
  function mintTournamentNft(address winner, uint256 tournamentId) external onlyOwner;
  ```
  Mint un NFT pour récompenser le gagnant d'un tournoi.

- **getGoatBalance**
  ```solidity
  function getGoatBalance(address pongTokenAddress) external view returns (uint256) onlyOwner;
  ```
  Récupère le solde du joueur désigné comme GOAT.

---

## 🔸 Contrat : PongToken

**Rôle :** Jeton ERC20 du jeu.

### Fonctions :
- **mint**
  ```solidity
  function mint(address to, uint256 amount) external onlyOwner;
  ```
---

## 🔸 Contrat : **GoatNft**

### Fonctions :
- **updateGoat**
  ```solidity
  function updateGoat(address newGoat, uint256 newBalance) external onlyOwner;
  ```
  ```
  Attention il faut faire en sorte que le nft ne soit que transferable par nous (msg.sender) (override ;)
  ```

---

## 🔸 Contrat : **TournamentNft**

**Rôle :** NFT décerné aux vainqueurs de tournois.

### Fonctions :
- **mintTournamentNft**
  ```solidity
  function mintTournamentNft(address winner, uint256 tournamentId) external onlyOwner;
  ```
  ```
  Attention il faut faire en sorte que le nft ne soit transferable dans aucun cas.
  ```

---

## 🔒 Sécurité et Permissions
- Le wallet de déploiement reste propriétaire de tous les contrats.
- Le `MasterContract` possède uniquement les autorisations nécessaires pour interagir avec les autres contrats via des fonctions dédiées.

---

## 🛠️ Déploiement
Un script de déploiement assurera que :
- Le wallet de déploiement reste le propriétaire.
- `MasterContract` reçoit les autorisations nécessaires sur les contrats secondaires via des appels appropriés après déploiement.
