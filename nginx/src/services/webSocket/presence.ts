import AuthNanoService from "../AuthNanoService.js";

interface Payload {
  type: string;
  message: string;
  connectedUsers: number[];
}

export default class Presence {
  private _webSocket: WebSocket | null = null;
  private static _instance: Presence;
  private _authService = AuthNanoService.getInstance();
  private _url = `${window.location.protocol}//${window.location.host}/presences'`;

  private _connectedUsers = new Set<number>();

  private constructor() {}

  public static getInstance(): Presence {
    if (!Presence._instance) {
      Presence._instance = new Presence();
    }
    return Presence._instance;
  }

  public async connect() {
    if (this._webSocket && this._webSocket.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }
    else if (this._webSocket) {
      return;
    }

    try {
      const jwtPayload = await this._authService.getJwtPayload();
      if (!jwtPayload?.sub) {
        console.warn('[PresenceService] User not authenticated, connection aborted.');
        return;
      }
      this._webSocket = new WebSocket(this._url);
    }
    catch (error) {
      console.error('[PresenceService] Connection failed due to authentication error:', error);
    }
  }
}




















// const url = `${window.location.protocol}//${window.location.host}/presences'`;
// const devUrl = "http://localhost:3002";

// export function createWebSocket() {
//   console.log(devUrl);
//   const webSocket = new WebSocket(devUrl);
//   webSocket.onmessage = (event) => {
//     console.log(event.data);
//     const data = JSON.parse(event.data);
//     console.log(data.connectedUsers);
//     const connectedUsers = data.connectedUsers;
//     // const [ connectedUsers ] = data;

//   console.log("WebSocket created");

//   webSocket.addEventListener("error", (event) => {
//     console.log("WebSocket error: ", event);
//   });
// }

// // export async function sendMessage(webSocket: WebSocket, message: string): void {
// //   await webSocket.send(message);
// // }
