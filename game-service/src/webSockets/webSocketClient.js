export class webSocketClient {
  constructor(url) {
      this.socket = new WebSocket(url);
      this.queue = [];
      this.initCallback = null;
      this.moveCallback = null;
      this.syncCallback = null;
      this.ballUpdateCallback = null;
      this.scoreUpdateCallback = null;

      this.socket.addEventListener('open', () => {
          console.log('WebSocket opened');
          this.queue.forEach(m => this.socket.send(m));
          this.queue = [];
      });

      this.socket.addEventListener('message', ({ data }) => {
          const msg = JSON.parse(data);
          //console.log('Received:', msg);

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
}