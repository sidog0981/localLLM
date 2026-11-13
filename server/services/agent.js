// Agent 서비스 — 로컬 LLM 추론 시뮬레이션 + 스트리밍
export class AgentService {
  constructor(wss, conversations, settings, system, llmProxy = null) {
    this.wss = wss;
    this.conversations = conversations;
    this.settings = settings;
    this.system = system;
    this.llmProxy = llmProxy;
    this.sessions = new Map();
  }

  // SSE 스트리밍 응답 (마지막 user 메시지에 기반)
  streamResponse(sessionId, req, res) {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Conversation not found' }));
      return;
    }

    // 마지막 user 메시지 찾기
    const lastUserMsg = conversation.messages
      .slice()
      .reverse()
      .find(m => m.role === 'user');

    // 이미 assistant 응답이 있는지 확인 (중복 방지)
    const lastMsg = conversation.messages[conversation.messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      // 이미 응답 있음 → 빈 스트림
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(`data: ${JSON.stringify({ type: 'stream_start', model: 'N/A', tokens: 0, timestamp: Date.now() })}\n\n`);
      res.write('data: [DONE]\n\n');
      return;
    }

    if (!lastUserMsg) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No user message to respond to' }));
      return;
    }

    const model = this.settings.get('model') || 'demo-llama3-8b';
    const maxTokens = this.settings.get('maxTokens') || 512;
    const temperature = this.settings.get('temperature') || 0.7;

    // 실제 LLM 연결 시도
    if (this.llmProxy) {
      const modelUrl = this.settings.get('customModelUrl');
      if (modelUrl) {
        this.streamFromLLM(model, maxTokens, temperature, lastUserMsg, sessionId, res);
        return;
      }
    }

    // 데모 스트리밍
    this.streamDemo(lastUserMsg.content, model, maxTokens, sessionId, res, req);
  }

  // 실제 LLM 스트리밍
  async streamFromLLM(model, maxTokens, temperature, userMsg, sessionId, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    try {
      const responseStream = await this.llmProxy.generate(userMsg.content, { model, maxTokens, temperature });

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

  // 데모 스트리밍 — 마지막 user 메시지 기준으로 응답 생성
  streamDemo(userPrompt, model, maxTokens, sessionId, res, req = null) {
    // 사용자 메시지를 기반으로 데모 응답 생성
    const prompt = userPrompt.slice(0, 30);
    const fullResponse = this.generateDemoResponse(prompt, userPrompt);

    let charIndex = 0;
    const totalChars = fullResponse.length;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

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

  generateDemoResponse(prompt, fullPrompt) {
    const responses = [
      `사용자: "${prompt}"\n\n이 메시지는 로컬 LLM 데모 서버에서 생성되었습니다.\n\n실제 환경에서는 Ollama, llama.cpp, or Mamba 모델과 연결하여 실제 추론을 수행합니다.\n\n현재 Mac Studio M5 Max (18-core CPU, 64GB RAM)에서 실행 중이며,\nSSE를 통해 토큰 단위 실시간 스트리밍을 제공합니다.`,
      `질문: "${prompt}"\n\n로컬 LLM 데모 서버에 오신 것을 환영합니다!\n\n이 데모는 SSE(Server-Sent Events)를 통해 실시간 토큰 스트리밍을 제공합니다.\nWebSocket을 통해 양방향 실시간 통신도 가능합니다.`,
      `입력 내용: "${prompt}"\n\n스트리밍 응답 확인 중...\n\n✅ SSE 토큰 단위 전송\n✅ 시스템 모니터링 실시간 업데이트\n✅ 대화 히스토리 자동 저장\n\n다른 파라미터를 설정 탭에서 조정해 보세요.`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
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
