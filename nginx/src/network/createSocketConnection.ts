type MessageHandler = (data: any) => void;

export function createWebSocketConnection(
  userId: string,
  onMessage: MessageHandler,
  onClose?: () => void,
  onError?: (error: Event) => void
): WebSocket {
  const wsUrl = "wss://elsalmatjori.com:8443";
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("[WebSocket] Connected");
    ws.send(
      JSON.stringify({
        userId,
        message: "init",
      })
    );
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (err) {
      console.error("[WebSocket] Failed to parse message:", err);
    }
  };

  ws.onclose = () => {
    console.warn("[WebSocket] Connection closed");
    if (onClose) onClose();
  };

  ws.onerror = (event) => {
    console.error("[WebSocket] Error:", event);
    if (onError) onError(event);
  };

  return ws;
}
