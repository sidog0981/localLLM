// 설정 라우트
import { Router } from 'express';

const router = Router();

let settingsStore = null;

export function setSettingsStore(store) {
  settingsStore = store;
}

// GET /api/settings — 전체 설정
router.get('/', (_req, res) => {
  if (!settingsStore) return res.json({ settings: {} });
  res.json({ settings: settingsStore.getAll() });
});

// GET /api/settings/:key — 개별 설정
router.get('/:key', (req, res) => {
  if (!settingsStore) return res.json({ value: null });
  const value = settingsStore.get(req.params.key);
  res.json({ key: req.params.key, value });
});

// POST /api/settings/:key — 설정 업데이트
router.post('/:key', (req, res) => {
  if (!settingsStore) return res.status(503).json({ error: 'Not initialized' });
  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: 'value required' });
  const success = settingsStore.set(req.params.key, value);
  if (!success) return res.status(400).json({ error: 'Invalid setting key' });
  res.json({ success: true, key: req.params.key, value });
});

// POST /api/settings/reset — 초기화
router.post('/reset', (_req, res) => {
  if (!settingsStore) return res.status(503).json({ error: 'Not initialized' });
  settingsStore.reset();
  res.json({ success: true });
});

export default router;
