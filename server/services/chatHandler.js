// WebSocket 채팅 핸들러
// WebSocket 연결을 통해 실시간 채팅 처리

export class ChatHandler {
  constructor(wss, agentService) {
    this.wss = wss;
    this.agentService = agentService;
  }

  // WebSocket 메시지 처리
  handle(ws, msg) {
    switch (msg.type) {
      case 'chat':
        this.handleChat(ws, msg);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        break;
      case 'request_conversations':
        this.sendConversations(ws);
        break;
    }
  }

  async handleChat(ws, msg) {
    const { sessionId, prompt } = msg;
    if (!sessionId || !prompt) {
      ws.send(JSON.stringify({ type: 'error', message: 'sessionId and prompt required' }));
      return;
    }

    ws.send(JSON.stringify({ type: 'chat_started', sessionId, prompt: prompt.slice(0, 50) }));

    try {
      const result = await this.agentService.startInference(sessionId, prompt);

      // SSE 스트림에서 토큰을 WebSocket으로 브로드캐스트
      const response = await fetch(`http://localhost:3000/api/agent/stream?sessionId=${sessionId}`);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'token') {
                  content += data.content;
                  ws.send(JSON.stringify({
                    type: 'chat_token',
                    sessionId,
                    content,
                  }));
                }
                if (data.type === 'stream_end') {
                  ws.send(JSON.stringify({
                    type: 'chat_complete',
                    sessionId,
                    content,
                  }));
                }
              } catch {}
            }
          }
        }
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: e.message }));
    }
  }

  sendConversations(ws) {
    this.agentService.conversations.list().forEach(conv => {
      ws.send(JSON.stringify({
        type: 'conversation',
        conversation: conv,
      }));
    });
    ws.send(JSON.stringify({ type: 'conversations_loaded' }));
  }
}
