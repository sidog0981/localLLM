// localLLM — 실시간 AI 추론 대시보드 서버
// Express + SSE + WebSocket 기반

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import agentRouter, { setAgentService } from './routes/agent.js';
import conversationRouter, { setConversationStore } from './routes/conversations.js';
import settingsRouter, { setSettingsStore } from './routes/settings.js';
import systemRouter, { setSystemMonitor } from './routes/system.js';

import { WebSocketManager } from './services/websocket.js';
import { AgentService } from './services/agent.js';
import { ConversationStore } from './services/conversations.js';
import { SettingsStore } from './services/settings.js';
import { SystemMonitor } from './services/system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ─── Services (created first) ────────────────────────────
const wss = new WebSocketManager(null); // temp, server will be set
const conversationStore = new ConversationStore();
const settingsStore = new SettingsStore();
const systemMonitor = new SystemMonitor();
const agentService = new AgentService(wss, conversationStore, settingsStore, systemMonitor);

// ─── HTTP Server ─────────────────────────────────────────
const server = createServer(app);

// Re-initialize WebSocket with real server
wss.reinitialize(server);

// ─── API Routes ──────────────────────────────────────────
app.use('/api/agent', agentRouter);
setAgentService(agentService);

app.use('/api/conversations', conversationRouter);
setConversationStore(conversationStore);

app.use('/api/settings', settingsRouter);
setSettingsStore(settingsStore);

app.use('/api/system', systemRouter);
setSystemMonitor(systemMonitor);

// SSE endpoint for streaming agent responses
app.get('/api/agent/stream', (req, res) => {
  const sessionId = req.query.sessionId;
  agentService.streamResponse(sessionId, req, res);
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Root → show API info or serve static
app.get('/', (_req, res) => {
  try {
    const indexPath = join(__dirname, '..', 'web-static', 'index.html');
    readFileSync(indexPath);
    res.sendFile(indexPath);
  } catch {
    res.json({
      message: 'localLLM API Server',
      version: '0.1.0',
      endpoints: {
        agent: '/api/agent',
        conversations: '/api/conversations',
        settings: '/api/settings',
        system: '/api/system',
        health: '/api/health',
      },
    });
  }
});

// Serve static files if built
const staticPaths = [join(__dirname, '..', 'dist'), join(__dirname, '..', 'web-static')];
for (const staticPath of staticPaths) {
  try {
    readFileSync(join(staticPath, 'index.html'));
    app.use(express.static(staticPath));
    break;
  } catch {
    // try next path
  }
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 localLLM Server running at http://0.0.0.0:${PORT}`);
  console.log(`📡 API:      http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  const summary = systemMonitor.getSummary();
  if (summary) console.log(`📊 System:   ${summary}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  wss.close();
  systemMonitor.stop();
  server.close(() => process.exit(0));
});

export { server };
