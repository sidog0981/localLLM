// Ollama 호환 LLM 프록시
// 실제 로컬 LLM 서버(Ollama, llama.cpp, LM Studio 등)에 연결

export class LLMProxy {
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  // 모델 목록 조회
  async listModels() {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      const data = await res.json();
      return data.models?.map(m => m.name) || [];
    } catch (e) {
      console.error('Ollama list error:', e.message);
      return [];
    }
  }

  // 모델 생성/추출
  async generate(prompt, options = {}) {
    const { model = 'llama3', maxTokens = 512, temperature = 0.7 } = options;

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: {
          num_predict: maxTokens,
          temperature,
        },
      }),
    });

    return res.body;
  }

  // 채팅 형식 추론 (chat API)
  async chat(messages, options = {}) {
    const { model = 'llama3', maxTokens = 512, temperature = 0.7 } = options;

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: {
          num_predict: maxTokens,
          temperature,
        },
      }),
    });

    return res.body;
  }

  // 서버 상태 확인
  async health() {
    try {
      await fetch(`${this.baseUrl}/api/tags`);
      return true;
    } catch {
      return false;
    }
  }
}
