// localLLM — 실시간 AI 추론 대시보드 서버
// Express + SSE + WebSocket 기반
// Ollama/llama.cpp 호환 LLM 프록시 지원

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import agentRouter, { setAgentService } from './routes/agent.js';
import conversationRouter, { setConversationStore } from './routes/conversations.js';
import settingsRouter, { setSettingsStore } from './routes/settings.js';
import systemRouter, { setSystemMonitor } from './routes/system.js';

import { WebSocketManager } from './services/websocket.js';
import { ChatHandler } from './services/chatHandler.js';
import { AgentService } from './services/agent.js';
import { ConversationStore } from './services/conversations.js';
import { SettingsStore } from './services/settings.js';
import { SystemMonitor } from './services/system.js';
import { LLMProxy } from './services/llmProxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ─── Services ────────────────────────────────────────────
const wss = new WebSocketManager(null);
const conversationStore = new ConversationStore();
const settingsStore = new SettingsStore();
const systemMonitor = new SystemMonitor();
const llmProxy = new LLMProxy(settingsStore.get('customModelUrl') || 'http://localhost:11434');

// ─── HTTP Server ─────────────────────────────────────────
const server = createServer(app);
wss.reinitialize(server);

// Chat handler for WebSocket
const chatHandler = new ChatHandler(wss, null); // agentService set below
wss.chatHandler = chatHandler;

// Agent service
const agentService = new AgentService(wss, conversationStore, settingsStore, systemMonitor, llmProxy);
chatHandler.agentService = agentService;

// ─── API Routes ──────────────────────────────────────────
app.use('/api/agent', agentRouter);
setAgentService(agentService);

app.use('/api/conversations', conversationRouter);
setConversationStore(conversationStore);

app.use('/api/settings', settingsRouter);
setSettingsStore(settingsStore);

app.use('/api/system', systemRouter);
setSystemMonitor(systemMonitor);

// SSE endpoint
app.get('/api/agent/stream', (req, res) => {
  const sessionId = req.query.sessionId;
  agentService.streamResponse(sessionId, req, res);
});

// Ollama proxy endpoint
app.post('/api/llm/proxy', async (req, res) => {
  const { action, model, prompt, messages, options } = req.body;

  try {
    let result;
    switch (action) {
      case 'list':
        result = await llmProxy.listModels();
        break;
      case 'generate':
        result = await llmProxy.generate(prompt, { model, ...options });
        break;
      case 'chat':
        result = await llmProxy.chat(messages, { model, ...options });
        break;
      default:
        res.status(400).json({ error: 'Invalid action' });
        return;
    }

    if (result && result.pipe) {
      // Stream the response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      result.on('data', (chunk) => {
        try {
          const data = JSON.parse(chunk.toString());
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch {}
      });

      result.on('end', () => {
        res.write('data: [DONE]\n\n');
        res.end();
      });

      result.on('error', (err) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      });
    } else {
      res.json(result);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    llmConnected: llmProxy.baseUrl,
  });
});

// Root → serve static
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
        llm: '/api/llm/proxy',
        health: '/api/health',
      },
    });
  }
});

// Serve static files
const staticPaths = [join(__dirname, '..', 'web-static'), join(__dirname, '..', 'dist')];
for (const staticPath of staticPaths) {
  try {
    const indexPath = join(staticPath, 'index.html');
    readFileSync(indexPath);
    console.log(`📁 Serving static files from: ${staticPath}`);
    app.use(express.static(staticPath));
    break;
  } catch (e) {
    // try next path
  }
}

// Start server
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 localLLM Server running at http://0.0.0.0:${PORT}`);
  console.log(`📡 API:      http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);

  // Check LLM connection
  const llmHealthy = await llmProxy.health();
  console.log(`🤖 LLM:      ${llmHealthy ? '✅ Connected' : '⚠️ Demo mode (set URL in settings)'} (${llmProxy.baseUrl})`);

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
