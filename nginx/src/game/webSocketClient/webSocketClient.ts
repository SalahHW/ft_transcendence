interface WebSocketMessage {
    type: string;
    playerId?: string;
    username?: string;
    message?: string;
    positionZ?: number;
    playerPositions?: { [key: string]: number };
    ballState?: any; // You can make this more specific based on your ball state structure
    scores?: { [key: string]: number };
    serverTime?: string;
    matchEndTime?: Date;
    [key: string]: any;
}

export class webSocketClient {
    public socket: WebSocket;
    public playerId: string | null;
    private queue: string[];
    private initCallback: ((msg: WebSocketMessage) => void) | null;
    private moveCallback: ((msg: WebSocketMessage) => void) | null;
    private syncCallback: ((msg: WebSocketMessage) => void) | null;
    private ballUpdateCallback: ((msg: WebSocketMessage) => void) | null;
    private scoreUpdateCallback: ((msg: WebSocketMessage) => void) | null;
    private gameEndCallback: ((msg: WebSocketMessage) => void) | null;
    private soundEventCallback: ((msg: WebSocketMessage) => void) | null;
    private messageCallback: ((msg: { data: string }) => void) | null;
    private powerupStateUpdateCallback: ((msg: WebSocketMessage) => void) | null;
    private powerupActivatedCallback: ((msg: WebSocketMessage) => void) | null;
    private powerupDeactivatedCallback: ((msg: WebSocketMessage) => void) | null;
    private ballTraversalCallback: ((msg: WebSocketMessage) => void) | null;
    private resetPlayerStatesCallback: ((msg: WebSocketMessage) => void) | null;
    public matchEndTime: Date | null;

    constructor(url: string, playerId: string | null = null) {
        // Handle URLs that already have query parameters
        let finalUrl = url;
        if (playerId && !url.includes('playerId=')) {
            const separator = url.includes('?') ? '&' : '?';
            finalUrl = `${url}${separator}playerId=${playerId}`;
        }
        this.socket = new WebSocket(finalUrl);
        this.playerId = playerId;
        this.queue = [];
        this.initCallback = null;
        this.moveCallback = null;
        this.syncCallback = null;
        this.ballUpdateCallback = null;
        this.scoreUpdateCallback = null;
        this.gameEndCallback = null;
        this.soundEventCallback = null;
        this.messageCallback = null;
        this.powerupStateUpdateCallback = null;
        this.powerupActivatedCallback = null;
        this.powerupDeactivatedCallback = null;
        this.ballTraversalCallback = null;
        this.resetPlayerStatesCallback = null;
        this.matchEndTime = null;

        this.socket.addEventListener('open', () => {
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
            let msg: WebSocketMessage;
            try {
                msg = JSON.parse(data);
    
            } catch (e) {
                console.error('Invalid JSON:', e);
                return;
            }

            if (this.messageCallback) {
                this.messageCallback({ data: JSON.stringify(msg) });
            }

            if (msg.type === 'usernameUpdate') {
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

            if (msg.type === 'soundEvent' && this.soundEventCallback) {
                this.soundEventCallback(msg);
            }

            if (msg.type === 'powerupStateUpdate' && this.powerupStateUpdateCallback) {
                this.powerupStateUpdateCallback(msg);
            }

            if (msg.type === 'powerupActivated' && this.powerupActivatedCallback) {
                this.powerupActivatedCallback(msg);
            }

            if (msg.type === 'powerupDeactivated' && this.powerupDeactivatedCallback) {
                this.powerupDeactivatedCallback(msg);
            }

            if (msg.type === 'ballTraversal' && this.ballTraversalCallback) {
                this.ballTraversalCallback(msg);
            }

            if (msg.type === 'resetPlayerStates' && this.resetPlayerStatesCallback) {
                this.resetPlayerStatesCallback(msg);
            }

            // Tournament-specific message handlers
            if (msg.type === 'tournamentWelcome' || msg.type === 'tournamentWaitingRoomStatus') {
                // These are handled by the messageCallback for tournament UI updates
                return;
            }
        });

        this.socket.addEventListener('error', err => console.error('WS error:', err));
        this.socket.addEventListener('close', () => {});
    }

    send(obj: any): void {
        const m = JSON.stringify(obj);
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(m);
        } else {
            this.queue.push(m);
        }
    }

    leaveGame(): void {
        // This method is now handled by webSocketClientDisconnect module
        // Keeping this for backward compatibility but delegating to disconnect handler
        console.warn('leaveGame() called on webSocketClient - should use webSocketClientDisconnect module instead');
        
        this.send({
            type: 'leaveGame',
            playerId: this.playerId
        });
        
        // Give a small delay to ensure the message is sent before closing
        setTimeout(() => {
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.close();
            }
        }, 100);
    }

    getMatchEndTime(): Date | null {
        return this.matchEndTime;
    }

    onInit(callback: (msg: WebSocketMessage) => void): void {
        this.initCallback = callback;
    }

    onPaddleMove(callback: (msg: WebSocketMessage) => void): void {
        this.moveCallback = callback;
    }

    onSync(callback: (msg: WebSocketMessage) => void): void {
        this.syncCallback = callback;
    }

    onBallUpdate(callback: (msg: WebSocketMessage) => void): void {
        this.ballUpdateCallback = callback;
    }

    onScoreUpdate(callback: (msg: WebSocketMessage) => void): void {
        this.scoreUpdateCallback = callback;
    }

    onGameEnd(callback: (msg: WebSocketMessage) => void): void {
        this.gameEndCallback = callback;
    }

    onSoundEvent(callback: (msg: WebSocketMessage) => void): void {
        this.soundEventCallback = callback;
    }

    set onMessage(callback: (msg: { data: string }) => void) {
        this.messageCallback = callback;
    }

    onPowerupStateUpdate(callback: (msg: WebSocketMessage) => void): void {
        this.powerupStateUpdateCallback = callback;
    }

    onPowerupActivated(callback: (msg: WebSocketMessage) => void): void {
        this.powerupActivatedCallback = callback;
    }

    onPowerupDeactivated(callback: (msg: WebSocketMessage) => void): void {
        this.powerupDeactivatedCallback = callback;
    }

    onBallTraversal(callback: (msg: WebSocketMessage) => void): void {
        this.ballTraversalCallback = callback;
    }

    onResetPlayerStates(callback: (msg: WebSocketMessage) => void): void {
        this.resetPlayerStatesCallback = callback;
    }

    activatePowerup(): void {
        const message = {
            type: 'powerupActivation',
            playerId: this.playerId,
            timestamp: Date.now()
        };
        
        this.send(message);
    }
} 