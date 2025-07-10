export default class PresenceSocketService {
  private static _instance: PresenceSocketService;
  private _ws: WebSocket | null = null;

  private constructor() {}

  public static getInstance(): PresenceSocketService {
    if (!this._instance) this._instance = new PresenceSocketService();
    return this._instance;
  }

  public connect(userId: string): void {
    if (this._ws) return;

    this._ws = new WebSocket("wss://localhost:8444");

    this._ws.onopen = () => {
      console.log("[WSS] Connected");
      this._ws?.send(JSON.stringify({ userId, message: "init" }));
    };

    this._ws.onmessage = (e) => {
      console.log("[WSS] Message:", e.data);
    };

    this._ws.onclose = () => {
      console.warn("[WSS] Disconnected");
      this._ws = null;
    };

    this._ws.onerror = (e) => {
      console.error("[WSS] Error:", e);
    };
  }

  public disconnect(): void {
    this._ws?.close();
    this._ws = null;
  }

  public send(data: object): void {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(data));
    } else {
      console.warn("[WSS] Cannot send message, socket not open.");
    }
  }
}
