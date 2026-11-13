// Agent 서비스 — 로컬 LLM 추론 시뮬레이션 + 스트리밍
import { Readable } from 'stream';

export class AgentService {
  constructor(wss, conversations, settings, system, llmProxy = null) {
    this.wss = wss;
    this.conversations = conversations;
    this.settings = settings;
    this.system = system;
    this.llmProxy = llmProxy;
    this.sessions = new Map();
  }

  // SSE 스트리밍 응답
  streamResponse(sessionId, req, res) {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Conversation not found' }));
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const model = this.settings.get('model') || 'demo-llama3-8b';
    const maxTokens = this.settings.get('maxTokens') || 512;
    const temperature = this.settings.get('temperature') || 0.7;

    // 실제 LLM 연결 시도
    if (this.llmProxy) {
      const modelUrl = this.settings.get('customModelUrl');
      if (modelUrl) {
        this.streamFromLLM(model, maxTokens, temperature, conversation.messageCount, sessionId, res, conversation);
        return;
      }
    }

    // 데모 스트리밍
    this.streamDemo(conversation, model, maxTokens, sessionId, res);
  }

  // 실제 LLM 스트리밍
  async streamFromLLM(model, maxTokens, temperature, messageCount, sessionId, res, conversation) {
    const lastMsg = conversation.messages?.[messageCount - 1];
    if (!lastMsg || lastMsg.role !== 'user') {
      res.write(`data: ${JSON.stringify({ error: 'No user message to respond to' })}\n\n`);
      res.end();
      return;
    }

    try {
      const responseStream = await this.llmProxy.generate(lastMsg.content, { model, maxTokens, temperature });

      res.write(`data: ${JSON.stringify({ type: 'stream_start', model, tokens: maxTokens, timestamp: Date.now() })}\n\n`);

      const reader = responseStream.getReader();
      const decoder = new TextDecoder();
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              content += data.response;
              res.write(`data: ${JSON.stringify({ type: 'token', content: data.response, index: content.length })}\n\n`);
            }
            if (data.done) {
              res.write(`data: ${JSON.stringify({ type: 'stream_end', tokens_used: content.length })}\n\n`);
              res.write('data: [DONE]\n\n');
              this.conversations.addMessage(sessionId, 'assistant', content);
              return;
            }
          } catch {}
        }
      }

      res.write('data: [DONE]\n\n');
    } catch (e) {
      console.error('LLM stream error:', e.message);
      res.write(`data: ${JSON.stringify({ error: 'LLM connection failed: ' + e.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }

  // 데모 스트리밍
  streamDemo(conversation, model, maxTokens, sessionId, res) {
    const demoResponses = [
      '안녕하세요! 로컬 LLM 데모입니다. 이 서버는 Mac Studio M5 Max에서 실행 중이며, 실시간으로 추론 결과를 스트리밍합니다.\n\n주요 기능:\n- **실시간 스트리밍**: SSE를 통해 토큰 단위 응답\n- **WebSocket**: 양방향 실시간 통신\n- **대화 관리**: 세션별 메시지 히스토리\n- **시스템 모니터링**: CPU/메모리 사용량',
      '좋습니다! 로컬에서 LLM을 돌리는 가장 효율적인 방법은 Mac Studio 같은 강력한 하드웨어를 활용하는 거예요.\n\n이 데모는 실제 LLM 대신 시뮬레이션을 사용하지만, 프로덕션에서는 Ollama, llama.cpp, Mamba 등을 연결할 수 있습니다.',
      '테스트 메시지입니다. 스트리밍 속도와 실시간 업데이트가 정상적으로 작동하는지 확인해주세요.\n\n문제가 있으면 설정 탭에서 모델 파라미터를 조정할 수 있습니다.',
    ];

    const responseIndex = conversation.messageCount % demoResponses.length;
    const fullResponse = demoResponses[responseIndex];

    let charIndex = 0;
    const totalChars = fullResponse.length;

    res.write(`data: ${JSON.stringify({ type: 'stream_start', model, tokens: maxTokens, timestamp: Date.now() })}\n\n`);

    const streamInterval = setInterval(() => {
      if (charIndex >= totalChars) {
        clearInterval(streamInterval);
        res.write(`data: ${JSON.stringify({ type: 'stream_end', tokens_used: charIndex, total: totalChars })}\n\n`);
        res.write('data: [DONE]\n\n');

        this.conversations.addMessage(sessionId, 'assistant', fullResponse);

        this.wss.broadcast({
          type: 'agent',
          event: 'response_complete',
          data: { sessionId, tokens_used: charIndex, model, timestamp: Date.now() },
        });
        return;
      }

      const chunkSize = Math.floor(Math.random() * 4) + 1;
      const chunk = fullResponse.slice(charIndex, charIndex + chunkSize);
      charIndex += chunkSize;

      res.write(`data: ${JSON.stringify({ type: 'token', content: chunk, index: charIndex })}\n\n`);

      if (charIndex % 20 === 0) {
        const sysStats = this.system.getStats();
        res.write(`data: ${JSON.stringify({ type: 'system_stats', ...sysStats })}\n\n`);
      }
    }, 15);

    req.on('close', () => {
      clearInterval(streamInterval);
      res.end();
    });
  }

  // 비동기 추론 시작
  async startInference(sessionId, prompt) {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // 사용자 메시지 추가
    this.conversations.addMessage(sessionId, 'user', prompt);

    // WebSocket으로 추론 시작 알림
    this.wss.broadcast({
      type: 'agent',
      event: 'inference_started',
      data: { sessionId, prompt: prompt.slice(0, 100) },
    });

    // SSE 스트리밍 시작
    this.wss.broadcast({
      type: 'agent',
      event: 'sse_ready',
      data: { sessionId, url: `/api/agent/stream?sessionId=${sessionId}` },
    });

    return { sessionId, status: 'processing' };
  }

  stopInference(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.abort();
      this.sessions.delete(sessionId);
    }

    this.wss.broadcast({
      type: 'agent',
      event: 'inference_stopped',
      data: { sessionId },
    });

    return { sessionId, status: 'stopped' };
  }

  getSessions() {
    return Array.from(this.sessions.entries()).map(([id, s]) => ({
      id,
      status: s.status,
      startedAt: s.startedAt,
    }));
  }
}
