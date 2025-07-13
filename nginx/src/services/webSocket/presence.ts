const url = `${window.location.protocol}//${window.location.host}/presences'`;
const devUrl = "http://localhost:3002";

export function createWebSocket() {
  console.log(devUrl);
  const webSocket = new WebSocket(devUrl);
  webSocket.onmessage = (event) => {
    console.log(event.data);
    const data = JSON.parse(event.data);
    console.log(data.connectedUsers);
    const connectedUsers = data.connectedUsers;
    // const [ connectedUsers ] = data;
    try {
      const payload = {
        userId: 42,
      };
      console.log(payload);
      const data = JSON.stringify(payload);
      console.log(data);
      webSocket.send(data);
    } catch (err) {
      console.log(err);
    }

    try {
      const payload = {
        userId: 43,
      };
      console.log(payload);
      const data = JSON.stringify(payload);
      console.log(data);
      webSocket.send(data);
    } catch (err) {
      console.log(err);
    }

    try {
      const payload = {
        userId: 44,
      };
      console.log(payload);
      const data = JSON.stringify(payload);
      console.log(data);
      webSocket.send(data);
    } catch (err) {
      console.log(err);
    }
  };
  console.log("WebSocket created");

  webSocket.addEventListener("error", (event) => {
    console.log("WebSocket error: ", event);
  });
}

// export async function sendMessage(webSocket: WebSocket, message: string): void {
//   await webSocket.send(message);
// }
