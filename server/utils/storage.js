// 서버용 키-값 저장소 (파일 기반)
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', '..', '.llm_data');

// 데이터 디렉토리 생성
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

function read(key) {
  try {
    const file = join(DATA_DIR, `${key}.json`);
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function write(key, value) {
  const file = join(DATA_DIR, `${key}.json`);
  writeFileSync(file, JSON.stringify(value), 'utf8');
}

export const storage = {
  getItem(key) {
    const val = read(key);
    return val !== null ? JSON.stringify(val) : null;
  },
  setItem(key, value) {
    try {
      write(key, JSON.parse(value));
    } catch {
      write(key, value);
    }
  },
  removeItem(key) {
    const file = join(DATA_DIR, `${key}.json`);
    if (existsSync(file)) {
      unlinkSync(file);
    }
  },
};
