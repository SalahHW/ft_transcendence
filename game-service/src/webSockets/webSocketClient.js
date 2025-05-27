export class webSocketClient {
    constructor(url, playerId = null) {
        this.socket = new WebSocket(playerId ? `${url}?playerId=${playerId}` : url);
        this.playerId = playerId;
        this.queue = [];
        this.initCallback = null;
        this.moveCallback = null;
        this.syncCallback = null;
        this.ballUpdateCallback = null;
        this.scoreUpdateCallback = null;
        this.gameEndCallback = null;
        this.messageCallback = null;
        this.matchEndTime = null;

        this.socket.addEventListener('open', () => {
            console.log('WebSocket opened');
            // Send setUsername message
            this.send({
                type: 'setUsername',
                playerId: this.playerId,
                username: null, // Rely on server for API-set username
            });
            // Send queued messages
            this.queue.forEach(m => this.socket.send(m));
            this.queue = [];
        });

        this.socket.addEventListener('message', ({ data }) => {
            let msg;
            try {
                msg = JSON.parse(data);
                // console.log('Received:', msg);
            } catch (e) {
                console.error('Invalid JSON:', e);
                return;
            }

            if (this.messageCallback) {
                this.messageCallback({ data: JSON.stringify(msg) });
            }

            if (msg.type === 'usernameUpdate') {
                console.log(`WebSocket received username update for player ${msg.playerId}: ${msg.username}`);
                if (this.messageCallback) {
                    this.messageCallback({ data: JSON.stringify(msg) });
                }
                return;
            }
            if (msg.type === 'error') {
                console.error('Server error:', msg.message);
                return;
            }

            if (msg.type === 'init' && this.initCallback) {
                this.initCallback(msg);
            }

            if (msg.type === 'paddleMove' && this.moveCallback) {
                this.moveCallback(msg);
            }

            if (msg.type === 'sync' && this.syncCallback) {
                this.syncCallback(msg);
            }

            if (msg.type === 'ballUpdate' && this.ballUpdateCallback) {
                this.ballUpdateCallback(msg);
            }

            if (msg.type === 'scoreUpdate' && this.scoreUpdateCallback) {
                this.scoreUpdateCallback(msg);
            }

            if (msg.type === 'gameEnd' && this.gameEndCallback) {
                this.matchEndTime = msg.serverTime ? new Date(msg.serverTime) : new Date();
                console.log(`Game ended at: ${this.matchEndTime.toISOString()}`);
                this.gameEndCallback({
                    ...msg,
                    matchEndTime: this.matchEndTime,
                });
            }
        });

        this.socket.addEventListener('error', err => console.error('WS error:', err));
        this.socket.addEventListener('close', () => console.log('WS closed'));
    }

    send(obj) {
        const m = JSON.stringify(obj);
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(m);
        } else {
            this.queue.push(m);
        }
    }

    getMatchEndTime() {
        return this.matchEndTime;
    }

    onInit(callback) {
        this.initCallback = callback;
    }

    onPaddleMove(callback) {
        this.moveCallback = callback;
    }

    onSync(callback) {
        this.syncCallback = callback;
    }

    onBallUpdate(callback) {
        this.ballUpdateCallback = callback;
    }

    onScoreUpdate(callback) {
        this.scoreUpdateCallback = callback;
    }

    onGameEnd(callback) {
        this.gameEndCallback = callback;
    }

    set onMessage(callback) {
        this.messageCallback = callback;
    }
}