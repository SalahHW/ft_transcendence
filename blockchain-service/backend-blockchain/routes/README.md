## Player Routes

- POST /add-player  
  → JWT required  
  → Body : name (string), address (Ethereum, 0x...)

- GET /player/:name  
  → URL param : name (string)

## Match Routes

- GET /match/:id  
  → URL param : id (integer)

- GET /match/player/:name  
  → URL param : name (string)

- GET /match/winner/:address  
  → URL param : address (Ethereum, 0x...)

- POST /report-match  
  → JWT required  
  → Body :
  - player1 (string)
  - player2 (string)
  - matchId (integer)
  - player1Score (0–255)
  - player2Score (0–255)
  - winner (Ethereum, 0x...)

## Tournament Routes

- GET /tournament/:id  
  → URL param : id (integer)

- GET /tournament/winner/:address  
  → URL param : address (Ethereum, 0x...)

- POST /report-tournament  
  → JWT required  
  → Body :
  - endTimestamp (integer)
  - matchIds (array of integers)
  - winner (Ethereum, 0x...)
  - tournamentTokenIds (integer)

## NFT Routes

- GET /nft/goat/:tokenId  
  → URL param : tokenId (integer)

- GET /nft/tournament/:tokenId  
  → URL param : tokenId (integer)
