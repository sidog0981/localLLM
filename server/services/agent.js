// Agent 서비스 — 로컬 LLM 추론 시뮬레이션 + 스트리밍
import { Readable } from 'stream';

export class AgentService {
  constructor(wss, conversations, settings, system) {
    this.wss = wss;
    this.conversations = conversations;
    this.settings = settings;
    this.system = system;
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

    // 데모: 의미 있는 추론 시뮬레이션
    const demoResponses = [
      '안녕하세요! 로컬 LLM 데모입니다. 이 서버는 Mac Studio M5 Max에서 실행 중이며, 실시간으로 추론 결과를 스트리밍합니다.\n\n주요 기능:\n- **실시간 스트리밍**: SSE를 통해 토큰 단위 응답\n- **WebSocket**: 양방향 실시간 통신\n- **대화 관리**: 세션별 메시지 히스토리\n- **시스템 모니터링**: CPU/메모리/GPU 사용량',
      '좋습니다! 로컬에서 LLM을 돌리는 가장 효율적인 방법은 Mac Studio 같은 강력한 하드웨어를 활용하는 거예요.\n\n이 데모는 실제 LLM 대신 시뮬레이션을 사용하지만, 프로덕션에서는 Ollama, llama.cpp, Mamba 등을 연결할 수 있습니다.',
      '테스트 메시지입니다. 스트리밍 속도와 실시간 업데이트가 정상적으로 작동하는지 확인해주세요.\n\n문제가 있으면 설정 탭에서 모델 파라미터를 조정할 수 있습니다.',
    ];

    const responseIndex = conversation.messageCount % demoResponses.length;
    const fullResponse = demoResponses[responseIndex];
    const words = fullResponse.split(/(\s+)/);

    let charIndex = 0;
    const totalChars = fullResponse.length;

    // 시작 이벤트
    res.write(`data: ${JSON.stringify({ type: 'stream_start', model, tokens: maxTokens, timestamp: Date.now() })}\n\n`);

    const streamInterval = setInterval(() => {
      if (charIndex >= totalChars) {
        clearInterval(streamInterval);
        res.write(`data: ${JSON.stringify({ type: 'stream_end', tokens_used: charIndex, total: totalChars })}\n\n`);
        res.write('data: [DONE]\n\n');

        // 대화에 추가
        this.conversations.addMessage(sessionId, 'assistant', fullResponse);

        // WebSocket 브로드캐스트
        this.wss.broadcast({
          type: 'agent',
          event: 'response_complete',
          data: {
            sessionId,
            tokens_used: charIndex,
            model,
            timestamp: Date.now(),
          },
        });
        return;
      }

      // 청크 단위 스트리밍
      const chunkSize = Math.floor(Math.random() * 4) + 1;
      const chunk = fullResponse.slice(charIndex, charIndex + chunkSize);
      charIndex += chunkSize;

      res.write(`data: ${JSON.stringify({ type: 'token', content: chunk, index: charIndex })}\n\n`);

      // 시스템 상태 주기적 전송
      if (charIndex % 20 === 0) {
        const sysStats = this.system.getStats();
        res.write(`data: ${JSON.stringify({ type: 'system_stats', ...sysStats })}\n\n`);
      }
    }, 15); // 15ms per chunk

    // 클라이언트 종료 시 정리
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

    // SSE 스트리밍 시작 (브로드캐스트하여 연결된 클라이언트들이 구독)
    this.wss.broadcast({
      type: 'agent',
      event: 'sse_ready',
      data: { sessionId, url: `/api/agent/stream?sessionId=${sessionId}` },
    });

    // 데모: 즉시 응답 생성
    setTimeout(() => {
      const responses = [
        `사용자 질문: "${prompt}"\n\n이 메시지는 로컬 LLM 데모 서버에서 생성되었습니다.\n\n실제 환경에서는 Ollama, llama.cpp, or Mamba 모델과 연결하여 실제 추론을 수행합니다.`,
        `"${prompt}"에 대한 답변입니다.\n\n이 서버는 SSE(Server-Sent Events)를 통해 실시간 토큰 스트리밍을 제공합니다.`,
        `질문 내용: ${prompt}\n\n스트리밍 응답은 위 /api/agent/stream 엔드포인트로 확인하실 수 있습니다.\n\nWebSocket 연결을 통해 양방향 실시간 통신도 가능합니다.`,
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      this.conversations.addMessage(sessionId, 'assistant', response);

      this.wss.broadcast({
        type: 'agent',
        event: 'response_generated',
        data: { sessionId, response: response.slice(0, 200) },
      });
    }, 500);

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
