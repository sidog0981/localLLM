// Agent 라우트 — 추론 시작, 중지, 스트리밍
import { Router } from 'express';

const router = Router();

let agentService = null;

// 서비스 inject (app에서 설정)
export function setAgentService(service) {
  agentService = service;
}

// POST /api/agent/infer — 추론 시작
router.post('/infer', (req, res) => {
  if (!agentService) return res.status(503).json({ error: 'Agent service not initialized' });

  const { sessionId, prompt } = req.body;
  if (!sessionId || !prompt) {
    return res.status(400).json({ error: 'sessionId and prompt required' });
  }

  agentService.startInference(sessionId, prompt)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// POST /api/agent/stop — 추론 중지
router.post('/stop', (req, res) => {
  if (!agentService) return res.status(503).json({ error: 'Agent service not initialized' });

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  res.json(agentService.stopInference(sessionId));
});

// GET /api/agent/stream — SSE 스트리밍 (agent.js에서 직접 핸들링)
// 이미 index.js에서 handler 정의됨

// GET /api/agent/sessions — 활성 세션 목록
router.get('/sessions', (_req, res) => {
  if (!agentService) return res.json({ sessions: [] });
  res.json({ sessions: agentService.getSessions() });
});

export default router;
