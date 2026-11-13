// 시스템 모니터링 — CPU / 메모리 / GPU
import { execSync } from 'child_process';

export class SystemMonitor {
  constructor() {
    this.interval = null;
    this.currentStats = {};
    this.collectOnce();
    this.startMonitoring();
  }

  startMonitoring() {
    this.interval = setInterval(() => {
      try { this.collectOnce(); } catch {}
    }, 5000);
  }

  collectOnce() {
    const stats = {};

    // CPU
    try {
      const topOut = execSync("top -l 1 -n 0 2>/dev/null | grep 'CPU usage'").toString();
      const m = topOut.match(/CPU usage:\s*([\d.]+)%\s*user,\s*([\d.]+)%\s*sys,\s*([\d.]+)%\s*idle/);
      if (m) {
        stats.cpuUsage = {
          user: parseFloat(m[1]),
          system: parseFloat(m[2]),
          idle: parseFloat(m[3]),
          total: parseFloat(m[1]) + parseFloat(m[2]),
        };
      }
    } catch {
      stats.cpuUsage = { user: 0, system: 0, idle: 100, total: 0 };
    }

    // CPU 코어
    try {
      stats.cpuCores = parseInt(execSync('sysctl -n hw.ncpu').toString().trim());
    } catch {
      stats.cpuCores = 0;
    }

    // 메모리 (vm_stat)
    try {
      const vm = execSync('vm_stat 2>/dev/null').toString();
      const pageBytes = 4096;
      const getPage = (keyword) => {
        const line = vm.split('\n').find(l => l.includes(keyword));
        if (!line) return 0;
        const n = parseInt(line.match(/([\d,]+)/)?.[1]?.replace(/,/g, '') || '0');
        return n * pageBytes;
      };
      const active = getPage('active');
      const wired = getPage('wired');
      const free = getPage('free');
      const total = active + wired + free || 1;
      stats.memory = {
        total,
        used: active + wired,
        free,
        percentage: (((active + wired) / total) * 100).toFixed(1),
      };
    } catch {
      stats.memory = { total: 0, used: 0, free: 0, percentage: '0' };
    }

    // 디스크
    try {
      const disk = execSync('df -k / 2>/dev/null | tail -1').toString().trim();
      const parts = disk.split(/\s+/);
      stats.disk = {
        total: `${(parseInt(parts[1]) / 1048576).toFixed(0)}GB`,
        used: `${(parseInt(parts[2]) / 1048576).toFixed(0)}GB`,
        available: `${(parseInt(parts[3]) / 1048576).toFixed(0)}GB`,
        percentage: parts[4],
      };
    } catch {
      stats.disk = { total: '-', used: '-', available: '-', percentage: '-' };
    }

    // 프로세스 수
    try {
      stats.processCount = parseInt(execSync('ps aux 2>/dev/null | wc -l').toString().trim()) - 1;
    } catch {
      stats.processCount = 0;
    }

    // 업타임
    stats.uptime = process.uptime();

    this.currentStats = stats;
  }

  getStats() {
    return this.currentStats;
  }

  getSummary() {
    const s = this.currentStats;
    if (!s.cpuCores) return 'system info unavailable';
    const gb = s.memory?.total ? (s.memory.total / 1073741824).toFixed(1) : '?';
    return `${s.cpuCores}-core CPU, ${gb}GB RAM`;
  }

  isAvailable() {
    return Object.keys(this.currentStats).length > 0 && this.currentStats.cpuCores > 0;
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }
}
