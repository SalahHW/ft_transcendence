import AuthService from '../AuthNanoService.js';

/**
 * Type pour les événements de présence reçus du serveur WebSocket.
 */
interface Payload {
  type: 'user_connected' | 'user_disconnected' | 'connection_success';
  userId: number;
  connectedUsers: number[];
}

/**
 * Type pour la fonction de callback qui sera appelée lors d'un changement de présence.
 */
export type PresenceCallback = (userId: number, status: 'online' | 'offline') => void;

/**
 * Service singleton pour gérer la connexion au service de présence via WebSocket.
 */
export default class PresenceService {
  private static _instance: PresenceService;
  private _authService = AuthService.getInstance();
  private _webSocket: WebSocket | null = null;
  private _reconnectAttempts = 0;
  private readonly _maxReconnectAttempts = 5;
  private readonly _reconnectDelay = 1000;
  private _url = `${window.location.protocol}//${window.location.host}/presences`;

  private _connectedUsers = new Set<number>();
  private _callbacks: PresenceCallback[] = [];

  private constructor() {}

  public static getInstance(): PresenceService {
    if (!PresenceService._instance) {
      PresenceService._instance = new PresenceService();
    }
    return PresenceService._instance;
  }

  public async connect(): Promise<void> {
    if (this._webSocket && this._webSocket.readyState === WebSocket.OPEN) {
      console.log('[PresenceService] Already connected.');
      return;
    }
    if (this._webSocket) {
        return;
    }

    try {
      const jwtPayload = await this._authService.getJwtPayload();
      if (!jwtPayload?.sub) {
        console.warn('[PresenceService] User not authenticated, connection aborted.');
        return;
      }

      console.log(`[PresenceService] Attempting to connect to ${this._url} for user ${jwtPayload.sub}`);
      this._webSocket = new WebSocket(this._url);
      this._setupWebSocketHandlers(jwtPayload.sub);

    } catch (error) {
      console.error('[PresenceService] Connection failed due to authentication error:', error);
    }
  }

  private _setupWebSocketHandlers(userId: number): void {
    if (!this._webSocket) return;

    this._webSocket.onopen = () => {
      console.log('[PresenceService] WebSocket connection established.');
      this._reconnectAttempts = 0;
      this._webSocket!.send(JSON.stringify({ userId, message: 'init' }));
    };

    this._webSocket.onmessage = (event) => {
      console.log('[PresenceService] Received data from server:', event.data);
      try {
        const data: Payload = JSON.parse(event.data);
        this._handlePresenceEvent(data);
      } catch (error) {
        console.error('[PresenceService] Error parsing message:', error);
      }
    };

    this._webSocket.onclose = () => {
      console.warn('[PresenceService] WebSocket connection closed.');
      this._webSocket = null;
      this._connectedUsers.forEach(id => this._notifyCallbacks(id, 'offline'));
      this._connectedUsers.clear();
      this._scheduleReconnect();
    };

    this._webSocket.onerror = (error) => {
      console.error('[PresenceService] WebSocket error:', error);

    };
  }

  private _handlePresenceEvent(event: Payload): void {
    console.log(`[PresenceService] Handling event of type "${event.type}"`, event);
    switch (event.type) {
      case 'connection_success':
        this._connectedUsers = new Set(event.connectedUsers);
        this._connectedUsers.forEach(id => this._notifyCallbacks(id, 'online'));
        break;
      case 'user_connected':
        console.log(`[PresenceService] User ${event.userId} has come online.`);
        this._connectedUsers.add(event.userId);
        this._notifyCallbacks(event.userId, 'online');
        break;
      case 'user_disconnected':
        console.log(`[PresenceService] User ${event.userId} has gone offline.`);
        this._connectedUsers.delete(event.userId);
        this._notifyCallbacks(event.userId, 'offline');
        break;
    }
  }

  private _notifyCallbacks(userId: number, status: 'online' | 'offline'): void {
    this._callbacks.forEach(callback => {
      try {
        callback(userId, status);
      } catch (error) {
        console.error('[PresenceService] Error in presence callback:', error);
      }
    });
  }

  private _scheduleReconnect(): void {
    if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      console.error('[PresenceService] Maximum reconnection attempts reached.');
      return;
    }

    this._reconnectAttempts++;
    const delay = this._reconnectDelay * Math.pow(2, this._reconnectAttempts - 1);

    console.log(`[PresenceService] Reconnecting in ${delay}ms...`);
    setTimeout(() => this.connect(), delay);
  }

  public disconnect(): void {
    if (this._webSocket) {
      this._reconnectAttempts = this._maxReconnectAttempts;
      this._webSocket.close();
    }
  }

  public isUserOnline(userId: number): boolean {
    return this._connectedUsers.has(userId);
  }

  public onPresenceChange(callback: PresenceCallback): void {
    this._callbacks.push(callback);
  }

  public offPresenceChange(callback: PresenceCallback): void {
    const index = this._callbacks.indexOf(callback);
    if (index > -1) {
      this._callbacks.splice(index, 1);
    }
  }
}
