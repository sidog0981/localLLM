// 설정 저장소
import { storage } from '../utils/storage.js';

const DEFAULT_SETTINGS = {
  model: 'demo-llama3-8b',
  maxTokens: 512,
  temperature: 0.7,
  topP: 0.9,
  streamEnabled: true,
  wsEnabled: true,
  autoScroll: true,
  theme: 'dark',
  apiBaseUrl: '',
  customModelUrl: '',
};

export class SettingsStore {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const raw = storage.getItem('llm_settings');
      if (raw) {
        const saved = JSON.parse(raw);
        this.settings = { ...this.settings, ...saved };
      }
    } catch { /* ignore */ }
  }

  saveToStorage() {
    storage.setItem('llm_settings', JSON.stringify(this.settings));
  }

  get(key) {
    return this.settings[key];
  }

  getAll() {
    return { ...this.settings };
  }

  set(key, value) {
    if (key in this.settings || DEFAULT_SETTINGS[key] !== undefined) {
      this.settings[key] = value;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  reset() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveToStorage();
  }
}
