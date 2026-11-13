// WebSocket 관리 — 연결/디스커넥트/브로드캐스트
import { WebSocketServer, WebSocket } from 'ws';

export class WebSocketManager {
  constructor(server) {
    this.server = server;
    this.wss = null;
    this.clients = new Map();
    // Will be initialized by index.js after server creation
  }

  reinitialize(server) {
    this.server = server;
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupHandlers();
  }

  setupHandlers() {
    this.wss.on('connection', (ws, req) => {
      const id = Math.random().toString(36).slice(2, 10);
      this.clients.set(id, ws);

      ws.id = id;
      ws.isAlive = true;

      // 연결 알림
      this.broadcast({ type: 'system', event: 'client_connected', data: { id, total: this.clients.size } });

      ws.on('pong', () => { ws.isAlive = true; });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(id, msg);
        } catch (e) {
          this.sendTo(id, { type: 'error', message: 'Invalid JSON' });
        }
      });

      ws.on('close', () => {
        this.clients.delete(id);
        this.broadcast({ type: 'system', event: 'client_disconnected', data: { id, total: this.clients.size } });
      });

      ws.on('error', (err) => {
        console.error(`[WS Error] Client ${id}:`, err.message);
      });

      console.log(`[WS] Client ${id} connected (${this.clients.size} total)`);
    });

    // Keep-alive ping every 30s
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  handleMessage(clientId, msg) {
    switch (msg.type) {
      case 'subscribe':
        // Subscriptions: { type: 'subscribe', channels: ['agent', 'system', 'conversation:<id>'] }
        break;
      case 'ping':
        this.sendTo(clientId, { type: 'pong', timestamp: Date.now() });
        break;
      case 'request':
        // Forward to agent service
        this.broadcast({ type: 'request', from: clientId, data: msg.data });
        break;
    }
  }

  sendTo(clientId, data) {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  broadcast(data) {
    const payload = JSON.stringify(data);
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  close() {
    this.wss.close();
  }

  getClientCount() {
    return this.clients.size;
  }
}
