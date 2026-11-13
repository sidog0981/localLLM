import { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  name: string;
  createdAt: string;
  messages: Message[];
  messageCount?: number;
}

type Tab = 'dashboard' | 'chat' | 'settings' | 'system';

// API base
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Utility: generate ID
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ─── Dashboard ───────────────────────────────────────────
function DashboardView({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const [stats, setStats] = useState({ conversations: 0, totalMessages: 0, model: 'demo-llama3-8b' });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Fetch stats
    fetch(`${API_BASE}/api/health`)
      .then(r => r.ok ? setConnected(true) : setConnected(false))
      .catch(() => setConnected(false));

    fetch(`${API_BASE}/api/conversations`)
      .then(r => r.json())
      .then(data => {
        const convs = data.conversations || [];
        let msgs = 0;
        convs.forEach((c: any) => { msgs += c.messageCount || 0; });
        setStats({ conversations: convs.length, totalMessages: msgs, model: 'demo-llama3-8b' });
      })
      .catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#6366f1' }}>localLLM</Text>
        <Text style={{ fontSize: 14, color: '#8892b0', marginTop: 4 }}>
          {connected ? '✅ 서버 연결됨' : '❌ 서버 연결 불가'}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Stats Cards */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard label="대화" value={stats.conversations} icon="💬" />
          <StatCard label="메시지" value={stats.totalMessages} icon="📝" />
          <StatCard label="모델" value={stats.model.split('-')[1] || '?'} icon="🤖" small />
        </View>

        {/* Quick Actions */}
        <View style={{ backgroundColor: '#1a1d27', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#2d3148' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 16 }}>퀵 액션</Text>
          <QuickAction label="새 대화 시작" icon="➕" onPress={() => onNavigate('chat')} />
          <QuickAction label="시스템 상태" icon="📊" onPress={() => onNavigate('system')} />
          <QuickAction label="설정" icon="⚙️" onPress={() => onNavigate('settings')} />
        </View>

        {/* Info */}
        <View style={{ backgroundColor: '#1a1d27', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2d3148' }}>
          <Text style={{ fontSize: 14, color: '#8892b0', lineHeight: 20 }}>
            Mac Studio M5 Max에서 실행 중입니다.{'\n'}
            SSE + WebSocket로 실시간 추론 스트리밍을 지원합니다.{'\n'}
            다른 기기에서 http://[서버IP]:3000 으로 접속하세요.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon, small }: { label: string; value: string | number; icon: string; small?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#1a1d27', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2d3148', alignItems: 'center' }}>
      <Text style={{ fontSize: 24 }}>{icon}</Text>
      <Text style={{ fontSize: small ? 12 : 24, fontWeight: 'bold', color: '#e2e8f0', marginTop: 8 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#8892b0', marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function QuickAction({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#2d3148' }}
    >
      <Text style={{ fontSize: 18, marginRight: 12 }}>{icon}</Text>
      <Text style={{ fontSize: 15, color: '#e2e8f0', flex: 1 }}>{label}</Text>
      <Text style={{ color: '#6366f1', fontSize: 18 }}>›</Text>
    </Pressable>
  );
}

// ─── Chat View ───────────────────────────────────────────
function ChatView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/conversations`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {}
  };

  const selectConversation = async (id: string) => {
    setActiveConv(id);
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${id}`);
      const data = await res.json();
      setMessages(data.conversation?.messages || []);
    } catch {
      setMessages([]);
    }
  };

  const createConversation = async () => {
    const name = newName || `대화 ${conversations.length + 1}`;
    try {
      const res = await fetch(`${API_BASE}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      await loadConversations();
      if (data.conversation) {
        selectConversation(data.conversation.id);
      }
    } catch {}
    setShowNewDialog(false);
    setNewName('');
  };

  const deleteConversation = async (id: string) => {
    await fetch(`${API_BASE}/api/conversations/${id}`, { method: 'DELETE' });
    if (activeConv === id) {
      setActiveConv(null);
      setMessages([]);
    }
    await loadConversations();
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || streaming) return;
    const prompt = input.trim();
    setInput('');

    // Optimistic UI update
    const userMsg: Message = { id: uid(), role: 'user', content: prompt, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    try {
      // Start inference
      await fetch(`${API_BASE}/api/agent/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeConv, prompt }),
      });

      // Connect to SSE stream
      const response = await fetch(`${API_BASE}/api/agent/stream?sessionId=${activeConv}`);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                setStreaming(false);
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'token') {
                  accumulated += parsed.content;
                  setMessages((prev: Message[]) => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'assistant') {
                      return [...prev.slice(0, -1), { ...last, content: accumulated }];
                    }
                    return [...prev, { id: uid(), role: 'assistant', content: accumulated, timestamp: new Date().toISOString() }];
                  });
                }
              } catch {}
            }
          }
        }
      }
    } catch (e) {
      console.error('Stream error:', e);
    } finally {
      setStreaming(false);
    }

    await loadConversations();
  };

  const sidebarWidth = '280px';

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {/* Sidebar */}
      <View style={{ width: 280, backgroundColor: '#111318', borderRightWidth: 1, borderColor: '#2d3148', flexDirection: 'column' }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#2d3148' }}>
          <Pressable
            onPress={() => setShowNewDialog(true)}
            style={{ backgroundColor: '#6366f1', padding: 12, borderRadius: 10, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>➕ 새 대화</Text>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }}>
          {conversations.map(conv => (
            <View
              key={conv.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                backgroundColor: activeConv === conv.id ? '#1e2235' : 'transparent',
                borderBottomWidth: 1,
                borderColor: '#1a1d27',
              }}
            >
              <Pressable
                onPress={() => selectConversation(conv.id)}
                style={{ flex: 1 }}
              >
                <Text style={{ color: '#e2e8f0', fontSize: 14, fontWeight: conv.id === activeConv ? '600' : '400' }}>{conv.name}</Text>
                <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{conv.messageCount || 0} 메시지</Text>
              </Pressable>
              <Pressable onPress={() => deleteConversation(conv.id)}>
                <Text style={{ color: '#ef4444', fontSize: 16, padding: 4 }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Chat Area */}
      <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 && !streaming ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#6366f1', marginBottom: 12 }}>
              localLLM 데모
            </Text>
            <Text style={{ fontSize: 14, color: '#8892b0', textAlign: 'center', lineHeight: 22 }}>
              대화를 선택하고 메시지를 입력하면{'\n'}
              실시간으로 AI 추론 결과를 스트리밍합니다.
            </Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {streaming && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1' }} />
                <Text style={{ color: '#6366f1', fontSize: 13 }}>추론 중...</Text>
                <Text style={{ color: '#6366f1', fontSize: 13 }}>●</Text>
                <Text style={{ color: '#6366f1', fontSize: 13 }}>●</Text>
                <Text style={{ color: '#6366f1', fontSize: 13 }}>●</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Input */}
        <View style={{ padding: 16, borderTopWidth: 1, borderColor: '#2d3148', backgroundColor: '#111318' }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="메시지를 입력하세요..."
              placeholderTextColor="#64748b"
              multiline
              editable={!streaming}
              style={{
                flex: 1,
                backgroundColor: '#1a1d27',
                borderWidth: 1,
                borderColor: '#2d3148',
                borderRadius: 12,
                padding: 14,
                color: '#e2e8f0',
                fontSize: 15,
                maxHeight: 120,
              }}
            />
            <Pressable
              onPress={sendMessage}
              disabled={!input.trim() || streaming}
              style={{
                backgroundColor: input.trim() && !streaming ? '#6366f1' : '#2d3148',
                borderRadius: 12,
                padding: 14,
                justifyContent: 'center',
                alignItems: 'center',
                minWidth: 50,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 20 }}>↑</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* New conversation dialog */}
      {showNewDialog && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <View style={{ width: 320, backgroundColor: '#1a1d27', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#2d3148' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 16 }}>새 대화</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="대화 이름"
              placeholderTextColor="#64748b"
              style={{ backgroundColor: '#111318', borderWidth: 1, borderColor: '#2d3148', borderRadius: 10, padding: 12, color: '#e2e8f0', fontSize: 15, marginBottom: 16 }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={createConversation} style={{ flex: 1, backgroundColor: '#6366f1', padding: 12, borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>생성</Text>
              </Pressable>
              <Pressable onPress={() => setShowNewDialog(false)} style={{ flex: 1, backgroundColor: '#2d3148', padding: 12, borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ color: '#e2e8f0', fontWeight: '600' }}>취소</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <View style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: isUser ? '#6366f1' : '#1a1d27', borderRadius: 16, padding: 14, borderWidth: isUser ? 0 : 1, borderColor: '#2d3148' }}>
      <Text style={{ color: isUser ? '#fff' : '#e2e8f0', fontSize: 14, lineHeight: 20 }}>
        {message.content}
      </Text>
      <Text style={{ color: isUser ? 'rgba(255,255,255,0.6)' : '#64748b', fontSize: 10, marginTop: 8, textAlign: 'right' }}>
        {new Date(message.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );
}

// ─── System View ─────────────────────────────────────────
function SystemView() {
  const [stats, setStats] = useState<any>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/system/stats`);
        const data = await res.json();
        setStats(data.stats || {});
        setConnected(true);
      } catch {
        setConnected(false);
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '-';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const formatPercent = (n: number) => `${n.toFixed(1)}%`;

  const cpu = stats.cpuUsage || {};
  const mem = stats.memory || {};

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: connected ? '#22c55e' : '#ef4444' }}>
          {connected ? '● 시스템 모니터링' : '○ 연결 불가'}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* CPU */}
        <SystemCard title="CPU" icon="🔲">
          <MetricRow label="코어" value={`${stats.cpuCores || '-'}`} />
          <MetricRow label="사용률" value={formatPercent(cpu.total || 0)} color={cpu.total > 80 ? '#ef4444' : cpu.total > 50 ? '#eab308' : '#22c55e'} />
          <ProgressRing percentage={cpu.total || 0} size={80} />
        </SystemCard>

        {/* Memory */}
        <SystemCard title="메모리" icon="💾">
          <MetricRow label="총량" value={formatBytes(mem.total)} />
          <MetricRow label="사용" value={formatBytes(mem.used)} />
          <MetricRow label="여유" value={formatBytes(mem.free)} />
          <View style={{ marginTop: 8 }}>
            <ProgressBar percentage={parseFloat(mem.percentage || '0')} />
          </View>
        </SystemCard>

        {/* Disk */}
        {stats.disk && (
          <SystemCard title="디스크" icon="💿">
            <MetricRow label="용량" value={stats.disk.total} />
            <MetricRow label="사용" value={`${stats.disk.used} / ${stats.disk.total}`} />
            <MetricRow label="사용률" value={stats.disk.percentage} color={stats.disk.percentage.includes('9') ? '#ef4444' : '#22c55e'} />
          </SystemCard>
        )}

        {/* Process count */}
        {stats.processCount != null && (
          <SystemCard title="프로세스" icon="📋">
            <MetricRow label="실행 중" value={stats.processCount.toString()} />
          </SystemCard>
        )}
      </ScrollView>
    </View>
  );
}

function SystemCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#1a1d27', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#2d3148' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 20, marginRight: 10 }}>{icon}</Text>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#e2e8f0' }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: '#8892b0', fontSize: 13 }}>{label}</Text>
      <Text style={{ color: color || '#e2e8f0', fontSize: 14, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function ProgressRing({ percentage, size }: { percentage: number; size: number }) {
  // Simple visual representation
  const displayPercentage = Math.min(percentage, 100);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 6, borderColor: '#2d3148', justifyContent: 'center', alignItems: 'center', marginVertical: 12 }}>
      <View style={{ position: 'absolute', width: size - 12, height: size - 12, borderRadius: (size - 12) / 2, borderWidth: 6, borderColor: displayPercentage > 80 ? '#ef4444' : displayPercentage > 50 ? '#eab308' : '#22c55e', borderRightColor: 'transparent', borderTopColor: 'transparent', transform: [{ rotate: '-45deg' }] }} />
      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#e2e8f0' }}>{displayPercentage.toFixed(0)}%</Text>
    </View>
  );
}

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <View style={{ height: 8, backgroundColor: '#2d3148', borderRadius: 4, overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(percentage, 100)}%`, height: '100%', backgroundColor: percentage > 80 ? '#ef4444' : percentage > 50 ? '#eab308' : '#22c55e', borderRadius: 4 }} />
    </View>
  );
}

// ─── Settings View ───────────────────────────────────────
function SettingsView() {
  const [settings, setSettings] = useState<any>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/settings`);
        const data = await res.json();
        setSettings(data.settings || {});
        setConnected(true);
      } catch {
        setConnected(false);
      }
    };
    load();
  }, []);

  const updateSetting = async (key: string, value: any) => {
    await fetch(`${API_BASE}/api/settings/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = async () => {
    await fetch(`${API_BASE}/api/settings/reset`, { method: 'POST' });
    setSettings({});
  };

  const settingsList = [
    { key: 'model', label: '모델', type: 'text', placeholder: 'demo-llama3-8b' },
    { key: 'maxTokens', label: '최대 토큰 수', type: 'number', min: 64, max: 8192 },
    { key: 'temperature', label: 'Temperature', type: 'number', min: 0, max: 2, step: 0.1 },
    { key: 'topP', label: 'Top P', type: 'number', min: 0, max: 1, step: 0.05 },
    { key: 'streamEnabled', label: '스트리밍 활성화', type: 'toggle' },
    { key: 'wsEnabled', label: 'WebSocket 활성화', type: 'toggle' },
    { key: 'autoScroll', label: '자동 스크롤', type: 'toggle' },
    { key: 'theme', label: '테마', type: 'select', options: ['dark', 'light'] },
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: connected ? '#22c55e' : '#ef4444' }}>
          {connected ? '● 설정' : '○ 서버 연결 불가'}
        </Text>
        <Pressable onPress={resetSettings} style={{ backgroundColor: '#2d3148', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
          <Text style={{ color: '#e2e8f0', fontSize: 13 }}>초기화</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 12 }}>
        {settingsList.map(s => (
          <View key={s.key} style={{ backgroundColor: '#1a1d27', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2d3148' }}>
            <Text style={{ color: '#8892b0', fontSize: 12, marginBottom: 8 }}>{s.label}</Text>
            {s.type === 'text' && (
              <TextInput
                value={String(settings[s.key] || '')}
                onChangeText={(v) => updateSetting(s.key, v)}
                placeholder={s.placeholder}
                placeholderTextColor="#64748b"
                style={{ backgroundColor: '#111318', borderRadius: 8, padding: 10, color: '#e2e8f0', fontSize: 14 }}
              />
            )}
            {s.type === 'number' && (
              <TextInput
                value={String(settings[s.key] || '')}
                onChangeText={(v) => updateSetting(s.key, parseFloat(v) || 0)}
                keyboardType="decimal-pad"
                style={{ backgroundColor: '#111318', borderRadius: 8, padding: 10, color: '#e2e8f0', fontSize: 14 }}
              />
            )}
            {s.type === 'toggle' && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#e2e8f0', fontSize: 14 }}>
                  {settings[s.key] ? '✅ 활성화' : '⬜ 비활성화'}
                </Text>
                <Pressable onPress={() => updateSetting(s.key, !settings[s.key])} style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: settings[s.key] ? '#6366f1' : '#2d3148', justifyContent: 'flex-end', paddingHorizontal: 4 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', transform: [{ translateX: settings[s.key] ? 22 : 0 }] }} />
                </Pressable>
              </View>
            )}
            {s.type === 'select' && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {s.options!.map(opt => (
                  <Pressable
                    key={opt}
                    onPress={() => updateSetting(s.key, opt)}
                    style={{
                      paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8,
                      backgroundColor: settings[s.key] === opt ? '#6366f1' : '#111318',
                      borderWidth: 1, borderColor: settings[s.key] === opt ? '#6366f1' : '#2d3148',
                    }}
                  >
                    <Text style={{ color: settings[s.key] === opt ? '#fff' : '#8892b0', fontSize: 13, textTransform: 'capitalize' }}>{opt}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Main Dashboard (App Entry) ─────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: '#0f1117' }}>
      {/* Top Nav */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#2d3148', backgroundColor: '#111318' }}>
        <TabButton label="홈" icon="🏠" active={activeTab === 'dashboard'} onPress={() => setActiveTab('dashboard')} />
        <TabButton label="채팅" icon="💬" active={activeTab === 'chat'} onPress={() => setActiveTab('chat')} />
        <TabButton label="시스템" icon="📊" active={activeTab === 'system'} onPress={() => setActiveTab('system')} />
        <TabButton label="설정" icon="⚙️" active={activeTab === 'settings'} onPress={() => setActiveTab('settings')} />
      </View>

      {/* Content */}
      <View style={{ flex: 1, backgroundColor: '#0f1117' }}>
        {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'system' && <SystemView />}
        {activeTab === 'settings' && <SettingsView />}
      </View>
    </SafeAreaView>
  );
}

function TabButton({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: active ? '#6366f1' : 'transparent' }}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={{ fontSize: 11, color: active ? '#6366f1' : '#8892b0', marginTop: 2, fontWeight: active ? '600' : '400' }}>{label}</Text>
    </Pressable>
  );
}
