// ====== State ======
const API = 'http://localhost:3000';
let state = {
  conversations: [],
  activeConv: null,
  messages: [],
  streaming: false,
  settings: {},
  connected: false,
};

// ====== Utility ======
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

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
      } catch {}
    }
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
}

function renderConversationList() {
  const el = document.getElementById('conversation-list');
  if (state.conversations.length === 0) {
    el.innerHTML = '<div class="conv-group-label">대화 없음</div>';
    return;
  }
  el.innerHTML = state.conversations.map(c => `
    <div class="conv-item ${c.id === state.activeConv ? 'active' : ''}" onclick="selectConversation('${c.id}')">
      <span class="conv-name">${escapeHtml(c.name)}</span>
      <span class="conv-actions">
        <span class="conv-delete" onclick="event.stopPropagation(); deleteConversation('${c.id}')">✕</span>
      </span>
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

// ====== Modal ======
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
    el.innerHTML = '<div class="welcome"><h1>무엇을 도와드릴까요?</h1></div>';
    return;
  }

  if (state.messages.length === 0 && state.streaming) {
    el.innerHTML = '<div class="streaming-dots"><span></span><span></span><span></span></div>';
    return;
  }

  el.innerHTML = state.messages.map(m => `
    <div class="message ${m.role}">
      <div class="msg-avatar"></div>
      <div class="msg-content">
        <p>${escapeHtml(m.content)}</p>
      </div>
    </div>
  `).join('');

  if (state.streaming) {
    el.innerHTML += '<div class="streaming-dots"><span></span><span></span><span></span></div>';
  }

  scrollToBottom();
}

function updateStreamingMessage(content) {
  const el = document.getElementById('chat-messages');
  let streamMsg = el.querySelector('.message.assistant:last-of-type');
  if (!streamMsg) {
    streamMsg = document.createElement('div');
    streamMsg.className = 'message assistant';
    streamMsg.innerHTML = `
      <div class="msg-avatar"></div>
      <div class="msg-content"><p></p></div>`;
    const dots = el.querySelector('.streaming-dots');
    if (dots) el.insertBefore(streamMsg, dots);
    else el.appendChild(streamMsg);
  }
  streamMsg.querySelector('p').textContent = content;
  scrollToBottom();
}

function scrollToBottom() {
  const el = document.getElementById('chat-messages');
  if (el) el.scrollTop = el.scrollHeight;
}

// ====== Send Message ======
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || !state.activeConv || state.streaming) return;

  const lastMsg = state.messages[state.messages.length - 1];
  if (lastMsg && lastMsg.role === 'assistant') return;

  input.value = '';
  autoResizeInput();

  const userMsg = { id: uid(), role: 'user', content: text, timestamp: new Date().toISOString() };
  state.messages.push(userMsg);
  renderMessages();

  try {
    state.streaming = true;
    updateStreamingUI();

    await fetch(`${API}/api/agent/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: state.activeConv, prompt: text }),
    });

    await streamSSE(state.activeConv);
  } catch (e) {
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
  if (name === 'settings') loadSettings();
}

// ====== Settings ======
async function loadSettings() {
  const data = await api('/api/settings');
  if (!data) return;
  state.settings = data.settings || {};

  document.getElementById('set-model').value = state.settings.model || '';
  document.getElementById('set-maxTokens').value = state.settings.maxTokens ?? '';
  document.getElementById('set-temperature').value = state.settings.temperature ?? '';
  document.getElementById('set-topP').value = state.settings.topP ?? '';

  const setToggle = (key, btnId) => {
    document.getElementById(btnId).className = `toggle ${state.settings[key] ? 'active' : ''}`;
  };
  setToggle('streamEnabled', 'btn-stream');
  setToggle('autoScroll', 'btn-autoscroll');
}

async function toggleSetting(key) {
  const val = !state.settings[key];
  await api(`/api/settings/${key}`, { method: 'POST', body: { value: val } });
  state.settings[key] = val;
  loadSettings();
}

// ====== Server Info ======
function showServerInfo() {
  const localIP = getLocalIP();
  alert(
    `Server:  http://localhost:3000\n` +
    `External: http://${localIP}:3000\n` +
    `접속: http://${localIP}:3000\n` +
    `API: http://localhost:3000/api/health`
  );
}

function getLocalIP() {
  try {
    const ac = new RTCPeerConnection({ iceServers: [] });
    ac.createDataChannel('');
    const offer = ac.createOffer();
    ac.onicecandidate = (e) => {
      if (!e || !e.candidate || !e.candidate.candidate) return;
      const m = e.candidate.candidate.match(/([0-9]{1,3}\\.){3}[0-9]{1,3}/);
      if (m) return m[0];
    };
    ac.setLocalDescription(offer);
  } catch {}
  return '127.0.0.1';
}

// ====== Helpers ======
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ====== Connection ======
async function checkConnection() {
  const data = await api('/api/health');
  state.connected = !!data;
}

// ====== Auto Resize Input ======
function autoResizeInput() {
  const input = document.getElementById('chat-input');
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 200) + 'px';
}

document.getElementById('chat-input').addEventListener('input', autoResizeInput);

// ====== Init ======
async function init() {
  await Promise.all([checkConnection(), loadConversations()]);
  setInterval(checkConnection, 10000);
}

init();
