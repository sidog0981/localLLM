// 대화 라우트 — CRUD + 메시지
import { Router } from 'express';

const router = Router();

let conversationStore = null;

export function setConversationStore(store) {
  conversationStore = store;
}

// GET /api/conversations — 목록
router.get('/', (_req, res) => {
  if (!conversationStore) return res.json({ conversations: [] });
  res.json({ conversations: conversationStore.list() });
});

// POST /api/conversations — 생성
router.post('/', (req, res) => {
  if (!conversationStore) return res.status(503).json({ error: 'Not initialized' });
  const { name } = req.body;
  const conv = conversationStore.create(name || '새 대화');
  res.json({ conversation: conv });
});

// GET /api/conversations/:id — 상세
router.get('/:id', (req, res) => {
  if (!conversationStore) return res.status(503).json({ error: 'Not initialized' });
  const conv = conversationStore.get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Not found' });
  res.json({ conversation: conv });
});

// PATCH /api/conversations/:id — 이름 변경
router.patch('/:id', (req, res) => {
  if (!conversationStore) return res.status(503).json({ error: 'Not initialized' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  conversationStore.rename(req.params.id, name);
  res.json({ success: true });
});

// DELETE /api/conversations/:id — 삭제
router.delete('/:id', (req, res) => {
  if (!conversationStore) return res.status(503).json({ error: 'Not initialized' });
  conversationStore.delete(req.params.id);
  res.json({ success: true });
});

// POST /api/conversations/:id/clear — 메시지 클리어
router.post('/:id/clear', (req, res) => {
  if (!conversationStore) return res.status(503).json({ error: 'Not initialized' });
  conversationStore.clearSession(req.params.id);
  res.json({ success: true });
});

// POST /api/conversations/:id/message — 메시지 추가
router.post('/:id/message', (req, res) => {
  if (!conversationStore) return res.status(503).json({ error: 'Not initialized' });
  const { role, content } = req.body;
  if (!role || !content) return res.status(400).json({ error: 'role and content required' });
  const msg = conversationStore.addMessage(req.params.id, role, content);
  res.json({ message: msg });
});

export default router;
