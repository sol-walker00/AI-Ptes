import { useEffect, useState } from 'react';
import { buildPetMessages, mapAssistantTextToReply } from '../../domain/petBrain';
import { defaultModelSettings } from '../../domain/modelSettings';
import { appendPetEvent, applyPetEvent, createInitialPetState, createPetEvent } from '../../domain/petState';
import { emptyMemory, updateMemorySummary } from '../../domain/memory';
import type { MemorySummary, ModelSettings, PetEvent, PetProfile, PetState } from '../../domain/petTypes';
import { backend } from '../../tauri/commands';
import type { UiChatMessage } from '../../tauri/commandTypes';
import { MessageList } from '../components/MessageList';

const nowIso = () => new Date().toISOString();
const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function ChatWindow() {
  const [profile, setProfile] = useState<PetProfile>({ name: '桃桃', species: '桌面小猫', personaId: 'healing', createdAt: nowIso() });
  const [state, setState] = useState<PetState>(() => createInitialPetState(nowIso()));
  const [memory, setMemory] = useState<MemorySummary>(() => emptyMemory(nowIso()));
  const [events, setEvents] = useState<PetEvent[]>([]);
  const [settings, setSettings] = useState<ModelSettings>({ ...defaultModelSettings });
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    backend.loadAppData().then((data) => {
      if (data.profile) setProfile(data.profile);
      if (data.state) setState(data.state);
      setMemory(data.memory);
      setEvents(data.events);
      setSettings(data.settings);
    });
  }, []);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const userMessage: UiChatMessage = { id: id(), role: 'user', content: trimmed, createdAt: nowIso() };
    setMessages((current) => [...current, userMessage]);
    setText('');
    setBusy(true);
    const event = createPetEvent('chat', nowIso(), { userText: trimmed, intensity: 0.5 });
    const nextEvents = appendPetEvent(events, event);
    const thinking = applyPetEvent(state, event, events);
    setState(thinking);
    setEvents(nextEvents);

    try {
      const aiMessages = buildPetMessages({ profile, state: thinking, memory, userText: trimmed });
      const response = await backend.sendPetChat({
        ...settings,
        messages: aiMessages,
      });
      const reply = mapAssistantTextToReply(response.text, thinking);
      const nextMemory = updateMemorySummary(memory, `用户说：${trimmed} 宠物回应：${reply.text}`, nowIso());
      const petMessage: UiChatMessage = { id: id(), role: 'pet', content: reply.text, createdAt: nowIso() };
      setMessages((current) => [...current, petMessage]);
      setState(reply.nextState);
      setMemory(nextMemory);
      await backend.saveAppData({ profile, state: reply.nextState, settings, memory: nextMemory, events: nextEvents });
    } catch (error) {
      const petMessage: UiChatMessage = {
        id: id(),
        role: 'pet',
        content: String(error).toLowerCase().includes('api key') ? '我还没有接上大脑，去设置里放入 API key 吧。' : '我有点晕乎，这次没想明白。',
        createdAt: nowIso(),
      };
      setMessages((current) => [...current, petMessage]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="panel-window chat-window">
      <header>
        <h1>和{profile.name}聊天</h1>
        <p>{profile.species} · {state.mood}</p>
      </header>
      <MessageList messages={messages} />
      <form className="chat-form" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        <label>
          聊天输入
          <textarea value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        <button className="primary-button" type="submit" disabled={busy} aria-label="发送消息">发送</button>
      </form>
    </main>
  );
}
