# ID Service

A microservice for managing unique match and tournament IDs in the Transcendence project.

## Features

- Register unique match IDs
- Register unique tournament IDs
- Prevent duplicate ID registration
- SQLite database storage
- RESTful API interface

## API Endpoints

### POST /ids

Register a new match ID or tournament ID.

**Request Body:**
```json
{
  "matchId": 123
}
```
or
```json
{
  "tournamentId": 456
}
```

**Response:**
- `201`: ID registered successfully
- `400`: Bad request (invalid input)
- `409`: ID already exists
- `500`: Internal server error

## Environment Variables

- `ID_SERVICE_PORT`: Service port (default: 3007)
- `ID_DB_PATH`: Database file path (default: ./database/ids.db)

## Database Schema

- `match_ids`: Stores unique match IDs
- `tournament_ids`: Stores unique tournament IDs

Both tables have:
- `id`: INTEGER PRIMARY KEY
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP 