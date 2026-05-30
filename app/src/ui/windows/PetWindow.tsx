import { useEffect, useState, type MouseEvent } from 'react';
import { Heart, MessageCircle, Moon, Utensils } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { buildPetMessages, mapAssistantTextToReply } from '../../domain/petBrain';
import { applyInteraction, createInitialPetState } from '../../domain/petState';
import { emptyMemory, updateMemorySummary } from '../../domain/memory';
import type { MemorySummary, ModelSettings, PetProfile, PetState } from '../../domain/petTypes';
import { backend } from '../../tauri/commands';
import { ActionButton } from '../components/ActionButton';
import { PetSprite } from '../components/PetSprite';
import { StatusBars } from '../components/StatusBars';

const nowIso = () => new Date().toISOString();

const defaultProfile: PetProfile = {
  name: '桃桃',
  species: '桌面小猫',
  personaId: 'healing',
  createdAt: nowIso(),
};

const defaultSettings: ModelSettings = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4.1-mini',
  temperature: 0.7,
};

export function PetWindow() {
  const [profile, setProfile] = useState<PetProfile>(defaultProfile);
  const [state, setState] = useState<PetState>(() => createInitialPetState(nowIso()));
  const [memory, setMemory] = useState<MemorySummary>(() => emptyMemory(nowIso()));
  const [settings, setSettings] = useState<ModelSettings>(defaultSettings);
  const [bubble, setBubble] = useState('点我说话吧。');
  const [inputOpen, setInputOpen] = useState(false);
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

  async function persist(nextState: PetState, nextMemory = memory) {
    await backend.saveAppData({
      profile,
      state: nextState,
      settings,
      memory: nextMemory,
    });
  }

  async function sendQuickMessage() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    const thinking = applyInteraction(state, 'chat', nowIso());
    setState(thinking);
    setBubble('我在想一想...');

    try {
      const messages = buildPetMessages({ profile, state: thinking, memory, userText: trimmed });
      const response = await backend.sendPetChat({
        baseUrl: settings.baseUrl,
        model: settings.model,
        temperature: settings.temperature,
        messages,
      });
      const reply = mapAssistantTextToReply(response.text, thinking);
      const nextMemory = updateMemorySummary(memory, `用户说：${trimmed} 宠物回应：${reply.text}`, nowIso());
      setBubble(reply.text);
      setState(reply.nextState);
      setMemory(nextMemory);
      await persist(reply.nextState, nextMemory);
    } catch (error) {
      const message = String(error);
      setBubble(message.toLowerCase().includes('api key') ? '我还没有接上大脑，先去设置 API key 吧。' : '我有点晕乎，等会儿再试试。');
      setState({ ...thinking, action: 'confused', mood: 'confused' });
    } finally {
      setText('');
      setBusy(false);
    }
  }

  function interact(kind: 'feed' | 'pet' | 'rest') {
    const next = applyInteraction(state, kind, nowIso());
    setState(next);
    setBubble(kind === 'feed' ? '好吃！' : kind === 'pet' ? '嘿嘿，再摸一下。' : '我眯一会儿。');
    void persist(next);
  }

  function startDrag(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button, input, form')) return;
    void getCurrentWindow().startDragging().catch(() => undefined);
  }

  return (
    <main className="pet-window" onMouseDown={startDrag}>
      <div className="speech-bubble">{bubble}</div>
      <button className="pet-click-target" onClick={() => setInputOpen((open) => !open)}>
        <PetSprite action={state.action} />
      </button>
      {inputOpen && (
        <form className="quick-chat" onSubmit={(event) => { event.preventDefault(); void sendQuickMessage(); }}>
          <input aria-label={`和${profile.name}说话`} value={text} onChange={(event) => setText(event.target.value)} />
          <button type="submit" disabled={busy}>发送</button>
        </form>
      )}
      <StatusBars state={state} />
      <div className="pet-actions">
        <ActionButton label="快速对话" onClick={() => setInputOpen((open) => !open)}><MessageCircle size={18} /></ActionButton>
        <ActionButton label="喂食" onClick={() => interact('feed')}><Utensils size={18} /></ActionButton>
        <ActionButton label="摸摸" onClick={() => interact('pet')}><Heart size={18} /></ActionButton>
        <ActionButton label="休息" onClick={() => interact('rest')}><Moon size={18} /></ActionButton>
      </div>
    </main>
  );
}
