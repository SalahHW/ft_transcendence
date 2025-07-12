export interface WSMessage {
  type: string;
  [key: string]: any;
}

export interface WSHandlers {
  onOpen?: (event: Event) => void;
  onMessage?: (data: WSMessage) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

export class PresencesClient {
  private ws: WebSocket | null = null;
  private handlers: WSHandlers;
  private userId: string;

  constructor(userId: string, handlers: WSHandlers = {}) {
    this.userId = userId;
    this.handlers = handlers;
  }

  /**
   * Build the WebSocket URL based on current location and port
   */
  private buildUrl(): string {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const host = location.hostname;
    const port = location.port;
    return port
      ? `${protocol}://${host}:${port}/presences/`
      : `${protocol}://${host}/presences/`;
  }

  /**
   * Open the WebSocket connection and bind event handlers
   */
  public connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }
    const url = this.buildUrl();
    this.ws = new WebSocket(url);

    this.ws.onopen = (event) => {
      // send initial "user_connected" message
      this.send({ message: 'user_connected', userId: this.userId });
      this.handlers.onOpen?.(event);
    };

    this.ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        this.handlers.onMessage?.(data);
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    this.ws.onerror = (event) => {
      this.handlers.onError?.(event);
    };

    this.ws.onclose = (event) => {
      this.handlers.onClose?.(event);
    };
  }

  /**
   * Send a JSON-serializable message over the WebSocket
   */
  public send(msg: Record<string, any>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('WebSocket is not open. ReadyState:', this.ws?.readyState);
    }
  }

  /**
   * Close the WebSocket connection
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Factory function to create and connect a PresencesClient
 */
export function createPresencesClient(
  userId: string,
  handlers: WSHandlers = {}
): PresencesClient {
  const client = new PresencesClient(userId, handlers);
  client.connect();
  return client;
}
