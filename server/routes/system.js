// 시스템 모니터링 라우트
import { Router } from 'express';

const router = Router();

let systemMonitor = null;

export function setSystemMonitor(monitor) {
  systemMonitor = monitor;
}

// GET /api/system/stats — 실시간 시스템 상태
router.get('/stats', (_req, res) => {
  if (!systemMonitor) return res.json({ stats: {} });
  res.json({ stats: systemMonitor.getStats() });
});

// GET /api/system/summary — 요약
router.get('/summary', (_req, res) => {
  if (!systemMonitor) return res.json({ summary: '' });
  res.json({ summary: systemMonitor.getSummary(), available: systemMonitor.isAvailable() });
});

export default router;
