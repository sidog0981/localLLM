// 대화 저장소 — 세션별 메시지 관리
import { storage } from '../utils/storage.js';

export class ConversationStore {
  constructor() {
    this.conversations = new Map();
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const raw = storage.getItem('conversations');
      if (raw) {
        const data = JSON.parse(raw);
        for (const [id, conv] of Object.entries(data)) {
          this.conversations.set(id, { ...conv, _messageSet: new Set(conv.messages.map(m => m.id)) });
        }
      }
    } catch { /* ignore */ }
  }

  saveToStorage() {
    const data = {};
    for (const [id, conv] of this.conversations) {
      data[id] = {
        id: conv.id,
        name: conv.name,
        createdAt: conv.createdAt,
        messages: conv.messages,
      };
    }
    storage.setItem('conversations', JSON.stringify(data));
  }

  create(name = '새 대화') {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const conv = {
      id,
      name,
      createdAt: new Date().toISOString(),
      messages: [],
      _messageSet: new Set(),
      messageCount: 0,
    };
    this.conversations.set(id, conv);
    this.saveToStorage();
    return conv;
  }

  get(id) {
    const conv = this.conversations.get(id);
    if (!conv) return null;
    return { id: conv.id, name: conv.name, createdAt: conv.createdAt, messages: conv.messages, messageCount: conv.messageCount };
  }

  list() {
    return Array.from(this.conversations.values()).map(c => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      messageCount: c.messageCount,
    }));
  }

  delete(id) {
    this.conversations.delete(id);
    this.saveToStorage();
  }

  rename(id, name) {
    const conv = this.conversations.get(id);
    if (conv) {
      conv.name = name;
      this.saveToStorage();
    }
  }

  addMessage(sessionId, role, content) {
    const conv = this.conversations.get(sessionId);
    if (!conv) return null;

    const msg = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      role,
      content,
      timestamp: new Date().toISOString(),
    };

    conv.messages.push(msg);
    conv._messageSet.add(msg.id);
    conv.messageCount++;
    this.saveToStorage();
    return msg;
  }

  clearSession(sessionId) {
    const conv = this.conversations.get(sessionId);
    if (conv) {
      conv.messages = [];
      conv.messageCount = 0;
      conv._messageSet = new Set();
      this.saveToStorage();
    }
  }
}
