# 🎮 Complete Pong Game Setup and Control Commands

## Table of Contents
- [Step 1: Register Two Players](#step-1-register-two-players)
- [Step 2: Connect Players via WebSocket](#step-2-connect-players-via-websocket)
- [Step 3: Manually Trigger Ball Spawn](#step-3-manually-trigger-ball-spawn)
- [Step 4: Control Paddles](#step-4-control-paddles)
- [Rapid Movement Examples](#rapid-movement-examples)
- [Quick Testing Commands](#quick-testing-commands)
- [Automated Game Setup Script](#automated-game-setup-script)
- [Troubleshooting](#troubleshooting)
- [Example Game Session](#example-game-session)

---

## Step 1: Register Two Players

### Register Player 1 (riri)
```bash
curl -s -X POST https://elsalmatjori.com:8443/api/game/players \
  -H "Content-Type: application/json" \
  -d '{"username": "riri"}' | jq -r 'if .data and .data.id then .data.id else .message // .error // empty end'
```

### Register Player 2 (fifi)
```bash
curl -s -X POST https://elsalmatjori.com:8443/api/game/players \
  -H "Content-Type: application/json" \
  -d '{"username": "fifi"}' | jq -r 'if .data and .data.id then .data.id else .message // .error // empty end'
```

### Set Players Ready
```bash
# Set Player 1 ready
curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER1ID/ready \
  -H "Content-Type: application/json" \
  -d '{}'

# Set Player 2 ready
curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER2ID/ready \
  -H "Content-Type: application/json" \
  -d '{}'

echo "Both players are now ready!"
```

---

## Step 2: Connect Players via WebSocket

**⚠️ REQUIRED!** You MUST open these in separate terminals for the game to start.

### Terminal 1: Connect Player 1
```bash
wscat -c wss://elsalmatjori.com:8443/api/game/ws?playerId=$PLAYER1
```

### Terminal 2: Connect Player 2
```bash
wscat -c wss://elsalmatjori.com:8443/api/game/ws?playerId=$PLAYER2
```

### Expected WebSocket Messages
Once both players connect, you should see messages like:
- `"waitingForPlayers"`
- `"init"` (when game starts)
- Player names should show `"riri vs fifi"` and `"fifi vs riri"`

---

## Step 3: Manually Trigger Ball Spawn

**🎯 CRITICAL FOR CURL TESTING!** After both players connect and you see `"init"` messages, send these in the WebSocket terminals:

### In Player 1's WebSocket terminal (wscat), send:
```json
{"type":"animationComplete"}
```

### In Player 2's WebSocket terminal (wscat), send:
```json
{"type":"animationComplete"}
```

You should see the ball appear and start moving after both messages are sent.

---

## Step 4: Control Paddles

Use these commands in **NEW terminals** (separate from WebSocket terminals).

### 🎮 Player 1 (riri) Controls

**Move riri's paddle UP** (1 unit per command):
```bash
curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER1/paddle/up
```

**Move riri's paddle DOWN** (1 unit per command):
```bash
curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER1/paddle/down
```

### 🎮 Player 2 (fifi) Controls

**Move fifi's paddle UP** (1 unit per command):
```bash
curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER2/paddle/up
```

**Move fifi's paddle DOWN** (1 unit per command):
```bash
curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER2/paddle/down
```

> **Note:** No need to stop - each command is a discrete movement!

---

## Rapid Movement Examples

### Move paddle up 3 units quickly
```bash
curl -X POST https://elsalmajori.games:8443/api/game/players/$PLAYER1/paddle/up && \
curl -X POST https://elsalmajori.games:8443/api/game/players/$PLAYER1/paddle/up && \
curl -X POST https://elsalmajori.games:8443/api/game/players/$PLAYER1/paddle/up
```

### Move paddle down 5 units with small delays
```bash
for i in {1..5}; do curl -X POST https://elsalmajori.games:8443/api/game/players/$PLAYER1/paddle/down; sleep 0.1; done
```

---

## Quick Testing Commands

### Check if players are registered
```bash
curl -X GET https://elsalmatjori.com:8443/api/game/players | jq
```
*Pretty print, shows error if any*

### Test paddle movement pattern
Player 1 goes up 3 times, then down 3 times:
```bash
curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER1/paddle/up | jq -r 'if .data then .data else .message // .error // empty end' && \
curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER1/paddle/up | jq -r 'if .data then .data else .message // .error // empty end' && \
curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER1/paddle/up | jq -r 'if .data then .data else .message // .error // empty end' && \
sleep 1 && \
curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER1/paddle/down | jq -r 'if .data then .data else .message // .error // empty end' && \
curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER1/paddle/down | jq -r 'if .data then .data else .message // .error // empty end' && \
curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER1/paddle/down | jq -r 'if .data then .data else .message // .error // empty end'
```

---

## Automated Game Setup Script

Save this as `setup_game.sh` and run: `chmod +x setup_game.sh && ./setup_game.sh`

```bash
#!/bin/bash
echo "🎮 Setting up Pong game..."

# Register players
echo "Registering players..."
PLAYER1=$(curl -s -X POST https://elsalmatjori.com:8443/api/game/players -H "Content-Type: application/json" -d '{"username": "riri"}' | jq -r 'if .data and .data.id then .data.id else .message // .error // empty end')
PLAYER2=$(curl -s -X POST https://elsalmatjori.com:8443/api/game/players -H "Content-Type: application/json" -d '{"username": "fifi"}' | jq -r 'if .data and .data.id then .data.id else .message // .error // empty end')

echo "✅ Player 1 (riri): $PLAYER1"
echo "✅ Player 2 (fifi): $PLAYER2"

# Set ready
echo "Setting players ready..."
curl -s -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER1/ready -H "Content-Type: application/json" -d '{}'
curl -s -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER2/ready -H "Content-Type: application/json" -d '{}'

echo "✅ Players are ready!"
echo ""
echo "🔌 Now connect via WebSocket in separate terminals:"
echo "Terminal 1: wscat -c wss://elsalmatjori.com:8443/api/game/ws?playerId=$PLAYER1"
echo "Terminal 2: wscat -c wss://elsalmatjori.com:8443/api/game/ws?playerId=$PLAYER2"
echo ""
echo "🎮 After both players connect and you see 'init' messages, send in WebSocket terminals:"
echo "Player 1 terminal: {\"type\":\"animationComplete\"}"
echo "Player 2 terminal: {\"type\":\"animationComplete\"}"
echo ""
echo "🎮 Then control paddles with these commands:"
echo "Player 1 UP:    curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER1/paddle/up"
echo "Player 1 DOWN:  curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER1/paddle/down"
echo "Player 2 UP:    curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER2/paddle/up"
echo "Player 2 DOWN:  curl -X POST https://elsalmatjori.com:8443/api/game/players/$PLAYER2/paddle/down"
echo ""
echo "💡 Each command moves paddle 1 unit. Paddle boundaries: -7.5 to +7.5"
```

---

## Troubleshooting

### If players don't connect properly:
1. Check server is running on `https://elsalmatjori.com:8443`
2. Make sure both WebSocket terminals are connected
3. Check for any error messages in the WebSocket terminals

### If paddle commands return errors:
1. Make sure players are connected via WebSocket first
2. Check the player IDs are correct
3. Verify the game has started (you should see `"init"` message)

### If ball doesn't appear:
1. Make sure **BOTH** players sent `animationComplete` messages
2. Check WebSocket terminals for any error messages
3. Verify both players are in the same room

### Expected WebSocket message flow:
1. Connection opens
2. Server sends `setUsername` confirmation  
3. Server sends `waitingForPlayers` message
4. When 2nd player connects, server sends `"init"` message
5. Send `animationComplete` messages (**BOTH** players)
6. Ball spawns and game starts - you can now control paddles!

---

## Example Game Session

1. Run the setup script
2. Connect both players via WebSocket
3. Wait for `"init"` message in both terminals
4. Send `animationComplete` messages in both WebSocket terminals
5. Use curl commands to move paddles
6. Watch the game play out in real-time!

**Game ends when one player reaches 11 points** - you'll see `"gameEnd"` message with winner information.

---

## Important Notes

### WebSocket Connection is ESSENTIAL

**Without WebSocket connection:**
- ❌ No game room assignment
- ❌ No matchmaking
- ❌ No game initialization  
- ❌ Paddle commands will fail

**WebSocket enables:**
- ✅ Room joining and matchmaking
- ✅ Game synchronization
- ✅ Ball movement
- ✅ Score updates
- ✅ Game state management

### Recent Updates

- ⭐ **FIXED:** Paddle commands now work via HTTP API for CLI control!
- ✅ You can use simple curl commands for paddle control once players are connected via WebSocket
- ✅ The API validation has been updated to allow HTTP paddle control for CLI usage 
- ⭐ **NEW:** Manual `animationComplete` messages required for ball spawning when testing with curl! 