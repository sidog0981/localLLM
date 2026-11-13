// ====== State ======
const API = 'http://localhost:3000';
let state = {
  conversations: [],
  activeConv: null,
  messages: [],
  streaming: false,
  settings: {},
  connected: false,
  systemStats: {},
};

// ====== Utility ======
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const formatTime = (iso) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
const formatBytes = (b) => { if (!b) return '-'; return (b / (1024 ** 3)).toFixed(1) + ' GB'; };
const formatDuration = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ====== API ======
async function api(path, opts = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('API Error:', e);
    return null;
  }
}

async function streamSSE(sessionId) {
  const url = `${API}/api/agent/stream?sessionId=${sessionId}`;
  const res = await fetch(url);
  if (!res.ok) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') {
        state.streaming = false;
        updateStreamingUI();
        loadConversations();
        return;
      }
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'token') {
          content += parsed.content;
          updateStreamingMessage(content);
        }
        if (parsed.type === 'system_stats') {
          updateSystemStats(parsed);
        }
        if (parsed.type === 'stream_end') {
          // stream_end 도착 → streamSSE의 별도 종료 처리
        }
      } catch {}
    }
  }

  state.streaming = false;
  updateStreamingUI();
  loadConversations();
}

// SSE 스트림: messageCount에 기반한 demo 대신 최신 토큰만 반환
async function streamLatestResponse(sessionId, startingCount) {
  const url = `${API}/api/agent/stream?sessionId=${sessionId}`;
  const res = await fetch(url);
  if (!res.ok) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let tokenCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'token') {
          tokenCount++;
          // messageCount가 시작 지점보다 클 때만 (새로운 응답)
          if (tokenCount <= 1) {
            content = parsed.content;
          } else {
            content += parsed.content;
          }
          updateStreamingMessage(content);
        }
        if (parsed.type === 'system_stats') {
          updateSystemStats(parsed);
        }
      } catch {}
    }
  }

  if (content) {
    state.messages.push({
      id: uid(),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
    });
    renderMessages();
  }

  state.streaming = false;
  updateStreamingUI();
  loadConversations();
}

// ====== Conversations ======
async function loadConversations() {
  const data = await api('/api/conversations');
  if (!data) return;
  state.conversations = data.conversations || [];
  renderConversationList();
  updateStats();
}

function renderConversationList() {
  const el = document.getElementById('conversation-list');
  el.innerHTML = state.conversations.map(c => `
    <div class="conv-item ${c.id === state.activeConv ? 'active' : ''}" onclick="selectConversation('${c.id}')">
      <span class="conv-name">${escapeHtml(c.name)}</span>
      <span class="conv-count">${c.messageCount || 0}</span>
      <span class="conv-delete" onclick="event.stopPropagation(); deleteConversation('${c.id}')">✕</span>
    </div>
  `).join('');
}

async function selectConversation(id) {
  state.activeConv = id;
  const data = await api(`/api/conversations/${id}`);
  if (!data) return;
  state.messages = data.conversation?.messages || [];
  renderMessages();
  renderConversationList();
  switchTab('chat');
}

async function createNewConversation() {
  const data = await api('/api/conversations', { method: 'POST', body: { name: '새 대화' } });
  if (!data) return;
  await loadConversations();
  selectConversation(data.conversation.id);
}

async function deleteConversation(id) {
  await api(`/api/conversations/${id}`, { method: 'DELETE' });
  if (state.activeConv === id) {
    state.activeConv = null;
    state.messages = [];
    renderMessages();
  }
  await loadConversations();
}

function showNewConversation() {
  document.getElementById('new-conv-modal').style.display = 'flex';
  document.getElementById('new-conv-name').value = '';
  document.getElementById('new-conv-name').focus();
}

function hideNewConversation() {
  document.getElementById('new-conv-modal').style.display = 'none';
}

function showErrorModal(message) {
  document.getElementById('error-message').textContent = message;
  document.getElementById('error-modal').style.display = 'flex';
}

function hideErrorModal() {
  document.getElementById('error-modal').style.display = 'none';
}

async function submitNewConversation() {
  const name = document.getElementById('new-conv-name').value.trim() || `대화 ${state.conversations.length + 1}`;
  const data = await api('/api/conversations', { method: 'POST', body: { name } });
  if (data) {
    await loadConversations();
    if (data.conversation) selectConversation(data.conversation.id);
  }
  hideNewConversation();
}

// ====== Messages ======
function renderMessages() {
  const el = document.getElementById('chat-messages');

  if (state.messages.length === 0 && !state.streaming) {
    el.innerHTML = `
      <div class="chat-welcome">
        <div class="welcome-icon">🧠</div>
        <h2>localLLM 데모</h2>
        <p>대화를 선택하고 메시지를 입력하면<br>실시간으로 AI 추론 결과를 스트리밍합니다.</p>
        <button class="btn-new-chat" onclick="createNewConversation()">새 대화 만들기</button>
      </div>`;
    return;
  }

  if (state.messages.length === 0 && state.streaming) {
    el.innerHTML = `
      <div class="chat-welcome">
        <div class="streaming-welcome">
          <div class="welcome-icon">⏳</div>
          <h2>추론 중...</h2>
        </div>
      </div>`;
    return;
  }

  el.innerHTML = state.messages.map(m => `
    <div class="message ${m.role}">
      <div class="msg-avatar">${m.role === 'user' ? '👤' : '🤖'}</div>
      <div>
        <div class="msg-bubble">${escapeHtml(m.content)}</div>
        <div class="msg-time">${formatTime(m.timestamp)}</div>
      </div>
    </div>
  `).join('');

  // Streaming indicator
  if (state.streaming) {
    el.innerHTML += `
      <div class="streaming-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
        <span>추론 중...</span>
      </div>`;
  }

  scrollToBottom();
}

function updateStreamingMessage(content) {
  const el = document.getElementById('chat-messages');
  // Find or create the streaming message bubble
  let streamMsg = el.querySelector('.message.assistant:last-of-type');
  if (!streamMsg) {
    streamMsg = document.createElement('div');
    streamMsg.className = 'message assistant';
    streamMsg.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div>
        <div class="msg-bubble"></div>
        <div class="msg-time">지금</div>
      </div>`;
    // Insert before streaming indicator
    const indicator = el.querySelector('.streaming-indicator');
    if (indicator) el.insertBefore(streamMsg, indicator);
    else el.appendChild(streamMsg);
  }
  streamMsg.querySelector('.msg-bubble').textContent = content;
  scrollToBottom();
}

function scrollToBottom() {
  const el = document.getElementById('chat-messages');
  if (el) el.scrollTop = el.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || !state.activeConv || state.streaming) return;

  // 이미 assistant 응답이 있으면 중복 방지
  const lastMsg = state.messages[state.messages.length - 1];
  if (lastMsg && lastMsg.role === 'assistant') return;

  input.value = '';
  input.disabled = true;
  document.getElementById('send-btn').disabled = true;

  // Add user message optimistically
  const userMsg = { id: uid(), role: 'user', content: text, timestamp: new Date().toISOString() };
  state.messages.push(userMsg);
  renderMessages();

  try {
    // Start inference
    state.streaming = true;
    updateStreamingUI();

    // Start inference API
    await fetch(`${API}/api/agent/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: state.activeConv, prompt: text }),
    });

    // Start SSE stream
    await streamSSE(state.activeConv);
  } catch (e) {
    // 서버 연결 실패 → 모달 표시
    state.streaming = false;
    updateStreamingUI();
    showErrorModal('서버에 연결할 수 없습니다.\n서버가 실행 중인지 확인해주세요.');
  }
}

function handleInputKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function updateStreamingUI() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  if (state.streaming) {
    input.disabled = true;
    sendBtn.disabled = true;
  } else {
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
  renderMessages();
}

// ====== Tabs ======
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');

  if (name === 'system') loadSystemStats();
  if (name === 'settings') loadSettings();
  if (name === 'dashboard') updateStats();
}

// ====== Dashboard Stats ======
async function updateStats() {
  let totalMsgs = 0;
  state.conversations.forEach(c => totalMsgs += c.messageCount || 0);
  document.getElementById('stat-conversations').textContent = state.conversations.length;
  document.getElementById('stat-messages').textContent = totalMsgs;

  const data = await api('/api/settings');
  if (data && data.settings?.model) {
    document.getElementById('stat-model').textContent = data.settings.model.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}

// ====== System Stats ======
async function loadSystemStats() {
  const data = await api('/api/system/stats');
  if (!data) {
    document.getElementById('system-status-badge').className = 'status-badge disconnected';
    document.getElementById('system-status-badge').textContent = '● 연결 불가';
    return;
  }
  updateSystemStats(data.stats);
}

function updateSystemStats(stats) {
  state.systemStats = stats;

  const cpu = stats.cpuUsage || {};
  const mem = stats.memory || {};
  const cpuPct = cpu.total || 0;

  // CPU ring
  const ring = document.getElementById('cpu-ring');
  const circumference = 326.73;
  ring.style.strokeDashoffset = circumference - (cpuPct / 100 * circumference);
  ring.style.stroke = cpuPct > 80 ? '#ef4444' : cpuPct > 50 ? '#eab308' : '#22c55e';
  document.getElementById('cpu-percent').textContent = Math.round(cpuPct);

  // Memory bars
  const memPct = parseFloat(mem.percentage || 0);
  document.getElementById('mem-bar-used').style.width = `${memPct}%`;
  document.getElementById('mem-bar-free').style.width = `${100 - memPct}%`;
  document.getElementById('mem-percent').textContent = `${memPct.toFixed(0)}%`;
  document.getElementById('mem-free').textContent = formatBytes(mem.free);
  document.getElementById('mem-total').textContent = formatBytes(mem.total);
  document.getElementById('mem-used').textContent = formatBytes(mem.used);

  // Disk
  if (stats.disk) {
    const diskPct = parseInt(stats.disk.percentage) || 0;
    document.getElementById('disk-bar').style.width = `${diskPct}%`;
    document.getElementById('disk-total').textContent = stats.disk.total;
    document.getElementById('disk-used').textContent = `${stats.disk.used} / ${stats.disk.total}`;
    document.getElementById('disk-percent').textContent = stats.disk.percentage;
    document.getElementById('disk-bar').style.background = diskPct > 80 ? '#ef4444' : diskPct > 50 ? '#eab308' : '#6366f1';
  }

  // Process count
  document.getElementById('process-count').textContent = stats.processCount || '-';
  document.getElementById('uptime').textContent = stats.uptime ? formatDuration(stats.uptime) : '-';

  // Dashboard CPU stat
  document.getElementById('stat-cpu').textContent = `${Math.round(cpuPct)}%`;

  // Core count
  document.getElementById('cpu-cores').textContent = stats.cpuCores || '-';

  // Connection status
  document.getElementById('system-status-badge').className = 'status-badge';
  document.getElementById('system-status-badge').textContent = '● 연결됨';
}

// ====== Settings ======
async function loadSettings() {
  const data = await api('/api/settings');
  if (!data) return;
  state.settings = data.settings || {};

  // Set values
  document.getElementById('set-model').value = state.settings.model || '';
  document.getElementById('set-maxTokens').value = state.settings.maxTokens ?? '';
  document.getElementById('set-temperature').value = state.settings.temperature ?? '';
  document.getElementById('set-topP').value = state.settings.topP ?? '';

  // Toggles
  const setToggle = (key, btnId, statusId) => {
    const val = state.settings[key];
    document.getElementById(btnId).className = `toggle-btn ${val ? 'active' : ''}`;
    document.getElementById(statusId).textContent = val ? '✅' : '⬜';
  };
  setToggle('streamEnabled', 'btn-stream', 'toggle-stream-enabled');
  setToggle('wsEnabled', 'btn-ws', 'toggle-ws-enabled');
  setToggle('autoScroll', 'btn-autoscroll', 'toggle-auto-scroll');

  // Theme
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === state.settings.theme);
  });
}

async function toggleSetting(key) {
  const val = !state.settings[key];
  await api(`/api/settings/${key}`, { method: 'POST', body: { value: val } });
  state.settings[key] = val;
  loadSettings(); // re-render toggles
}

async function resetSettings() {
  await api('/api/settings/reset', { method: 'POST' });
  loadSettings();
}

function setTheme(theme) {
  if (theme === 'light') {
    document.documentElement.style.setProperty('--bg', '#f8fafc');
    document.documentElement.style.setProperty('--surface', '#ffffff');
    document.documentElement.style.setProperty('--surface-hover', '#f1f5f9');
    document.documentElement.style.setProperty('--border', '#e2e8f0');
    document.documentElement.style.setProperty('--text', '#0f172a');
    document.documentElement.style.setProperty('--text-muted', '#64748b');
  } else {
    document.documentElement.style.setProperty('--bg', '#0a0e17');
    document.documentElement.style.setProperty('--surface', '#111827');
    document.documentElement.style.setProperty('--surface-hover', '#1a2332');
    document.documentElement.style.setProperty('--border', '#1e293b');
    document.documentElement.style.setProperty('--text', '#e2e8f0');
    document.documentElement.style.setProperty('--text-muted', '#64748b');
  }
  state.settings.theme = theme;
  api('/api/settings/theme', { method: 'POST', body: { value: theme } });
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
}

// ====== Server Info ======
function showServerInfo() {
  const localIP = getLocalIP();
  const info = `
🖥️ Server:  http://localhost:3000
📡 External: http://${localIP}:3000
🔌 WebSocket: ws://${localIP}:3000
📱 다른 기기에서 접속: http://${localIP}:3000
⚡ API docs: http://localhost:3000/api/health
  `;
  alert(info.trim());
}

function getLocalIP() {
  try {
    const ac = new RTCPeerConnection({ iceServers: [] });
    ac.createDataChannel('');
    const offer = ac.createOffer();
    ac.onicecandidate = (e) => {
      if (!e || !e.candidate || !e.candidate.candidate) return;
      const m = e.candidate.candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
      if (m) document.getElementById('server-ip').textContent = m[0];
    };
    ac.setLocalDescription(offer);
  } catch {}
  return '255.255.255.255';
}

// ====== Helpers ======
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function openTerminal() {
  showServerInfo();
}

// ====== Connection Check ======
async function checkConnection() {
  const data = await api('/api/health');
  state.connected = !!data;
  const badge = document.getElementById('connection-status');
  badge.className = state.connected ? 'status-badge' : 'status-badge disconnected';
  badge.textContent = state.connected ? '● 연결됨' : '● 연결 불가';
  updateStats();
}

// ====== Auto Resize Input ======
document.getElementById('chat-input').addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  this.disabled = state.streaming;
});

// ====== Init ======
async function init() {
  await Promise.all([
    checkConnection(),
    loadConversations(),
  ]);

  // Periodic refresh
  setInterval(async () => {
    await checkConnection();
    if (state.connected) {
      updateStats();
    }
  }, 10000);
}

init();
