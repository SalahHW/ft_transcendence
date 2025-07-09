# API Documentation - Blockchain Game Backend

This document outlines all the available REST API routes, their purposes, expected request payloads, and response structures.

---

## Player Routes

### POST `/add-player`

**Purpose**: Register a new player and mint 100 PONG tokens.

#### Request Body:

```json
{
  "name": "PlayerName",
  "address": "0xabc123..."
}
```

#### Success Response:

```json
{
  "success": true,
  "transactionHash": "0x..."
}
```

#### Failure Responses:

- `503` if contract is uninitialized.
- `422` if contract call fails (e.g., player already exists).

---

### GET `/player/:address`

**Purpose**: Fetch a player name by wallet address.

#### Params:

`address`: Ethereum address (string)

#### Success Response:

```json
{
  "success": true,
  "name": "PlayerName"
}
```

#### Failure:

- `503` or `500` if error during fetch.

---

### DELETE `/remove/:address`

**Purpose**: Remove a registered player. Transfers GOAT NFT if applicable.

#### Params:

`address`: Ethereum address (string)

#### Success Response:

```json
{
  "success": true,
  "transactionHash": "0x..."
}
```

#### Failure:

- `503` or `500` with error message.

---

## Match Routes

### POST `/report-match`

**Purpose**: Submit a match result.

#### Request Body:

```json
{
  "player1": "0x...",
  "player2": "0x...",
  "matchId": 1,
  "player1Score": 10,
  "player2Score": 5,
  "winner": "0x..."
}
```

#### Success Response:

```json
{
  "success": true,
  "transactionHash": "0x..."
}
```

#### Failure Responses:

- `403`, `404`, `409`, `422`, `502`

---

### GET `/match/:id`

**Purpose**: Retrieve match data by ID.

#### Params:

`id`: Integer

#### Success Response:

```json
{
  "success": true,
  "match": { ... }
}
```

#### Failure:

- `503` or `500`

---

### GET `/match/player/:address`

**Purpose**: Get all matches involving a player.

#### Success Response:

```json
{
  "success": true,
  "matches": [ ... ]
}
```

---

### GET `/match/winner/:address`

**Purpose**: Get all matches won by a player.

#### Failure:

- `404` if none found

---

## Tournament Routes

### POST `/report-tournament`

**Purpose**: Submit a tournament result. Each tournament always consists of exactly 4 matches.

#### Request Body:

```json
{
  "endTimestamp": 1620000000,
  "matchIds": [1, 2, 3, 4],
  "winner": "0x...",
  "tournamentTokenId": 123
}
```

> ⚠️ `matchIds` must always include **exactly 4** match IDs that were part of the tournament.

#### Success Response:

```json
{
  "success": true,
  "transactionHash": "0x..."
}
```

#### Failure Responses:

- `403`, `404`, `409`, `422`, `502`

---

### GET `/tournament/:id`

**Purpose**: Retrieve tournament data by ID.

#### Success Response:

```json
{
  "success": true,
  "tournament": { ... }
}
```

---

### GET `/tournament/winner/:address`

**Purpose**: Get all tournaments won by a specific address.

#### Success Response:

```json
{
  "success": true,
  "tournaments": [ ... ]
}
```

---

## NFT Routes

### GET `/nft/goat/:tokenId`

**Purpose**: Get owner of GOAT token (tokenId = 299)

#### Success Response:

```json
{
  "success": true,
  "tokenId": 299,
  "owner": "0x..."
}
```

#### Failure:

- `404` if not found

---

### GET `/nft/tournament/:tokenId`

**Purpose**: Get owner of a Tournament NFT by ID.

#### Success Response:

```json
{
  "success": true,
  "tokenId": "123",
  "owner": "0x..."
}
```

---

## Notes

- All Ethereum addresses must match `^0x[a-fA-F0-9]{40}$`
- Error handling is detailed and specific to blockchain conditions (e.g., unauthorized, already reported, not found).
