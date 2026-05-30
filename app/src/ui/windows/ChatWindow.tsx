import { useEffect, useState } from 'react';
import { buildPetMessages, mapAssistantTextToReply } from '../../domain/petBrain';
import { applyInteraction, createInitialPetState } from '../../domain/petState';
import { emptyMemory, updateMemorySummary } from '../../domain/memory';
import type { MemorySummary, ModelSettings, PetProfile, PetState } from '../../domain/petTypes';
import { backend } from '../../tauri/commands';
import type { UiChatMessage } from '../../tauri/commandTypes';
import { MessageList } from '../components/MessageList';

const nowIso = () => new Date().toISOString();
const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function ChatWindow() {
  const [profile, setProfile] = useState<PetProfile>({ name: '桃桃', species: '桌面小猫', personaId: 'healing', createdAt: nowIso() });
  const [state, setState] = useState<PetState>(() => createInitialPetState(nowIso()));
  const [memory, setMemory] = useState<MemorySummary>(() => emptyMemory(nowIso()));
  const [settings, setSettings] = useState<ModelSettings>({ baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', temperature: 0.7 });
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    backend.loadAppData().then((data) => {
      if (data.profile) setProfile(data.profile);
      if (data.state) setState(data.state);
      setMemory(data.memory);
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
    const thinking = applyInteraction(state, 'chat', nowIso());
    setState(thinking);

    try {
      const aiMessages = buildPetMessages({ profile, state: thinking, memory, userText: trimmed });
      const response = await backend.sendPetChat({
        baseUrl: settings.baseUrl,
        model: settings.model,
        temperature: settings.temperature,
        messages: aiMessages,
      });
      const reply = mapAssistantTextToReply(response.text, thinking);
      const nextMemory = updateMemorySummary(memory, `用户说：${trimmed} 宠物回应：${reply.text}`, nowIso());
      const petMessage: UiChatMessage = { id: id(), role: 'pet', content: reply.text, createdAt: nowIso() };
      setMessages((current) => [...current, petMessage]);
      setState(reply.nextState);
      setMemory(nextMemory);
      await backend.saveAppData({ profile, state: reply.nextState, settings, memory: nextMemory });
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
