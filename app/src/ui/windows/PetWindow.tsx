import { useEffect, useState, type MouseEvent } from 'react';
import { BookOpen, Heart, MessageCircle, Moon, Sparkles, Target, Utensils } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { defaultPetAvatar, normalizePetAvatar } from '../../domain/petAvatar';
import { buildPetMessages, mapAssistantTextToReply } from '../../domain/petBrain';
import { defaultModelSettings } from '../../domain/modelSettings';
import {
  applyTaskRewardToState,
  completeDailyTask,
  createJournalEntry,
  ensureDailyCare,
  taskForEventKind,
  taskRewardFor,
} from '../../domain/petLifecycle';
import {
  appendPetEvent,
  applyPetEvent,
  createInitialPetState,
  createPetEvent,
  normalizePetState,
  restoreStateAfterTime,
} from '../../domain/petState';
import { emptyMemory, updateMemorySummary } from '../../domain/memory';
import type { DailyCare, MemorySummary, ModelSettings, PetEvent, PetJournalEntry, PetProfile, PetState } from '../../domain/petTypes';
import { backend } from '../../tauri/commands';
import { ActionButton } from '../components/ActionButton';
import { PetSprite } from '../components/PetSprite';
import { StatusBars } from '../components/StatusBars';

const nowIso = () => new Date().toISOString();

const defaultProfile: PetProfile = {
  name: '桃桃',
  species: '桌面小猫',
  personaId: 'healing',
  avatar: defaultPetAvatar(),
  createdAt: nowIso(),
};

const defaultSettings: ModelSettings = {
  ...defaultModelSettings,
};

export function PetWindow() {
  const [profile, setProfile] = useState<PetProfile>(defaultProfile);
  const [state, setState] = useState<PetState>(() => createInitialPetState(nowIso()));
  const [memory, setMemory] = useState<MemorySummary>(() => emptyMemory(nowIso()));
  const [events, setEvents] = useState<PetEvent[]>([]);
  const [dailyCare, setDailyCare] = useState<DailyCare>(() => ensureDailyCare(undefined, nowIso()));
  const [journal, setJournal] = useState<PetJournalEntry[]>([]);
  const [settings, setSettings] = useState<ModelSettings>(defaultSettings);
  const [bubble, setBubble] = useState('点我说话吧。');
  const [inputOpen, setInputOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    backend.loadAppData().then((data) => {
      const loadedAt = nowIso();
      if (data.profile) setProfile({ ...data.profile, avatar: normalizePetAvatar(data.profile.avatar) });
      if (data.state) setState(restoreStateAfterTime(normalizePetState(data.state, loadedAt), loadedAt));
      setMemory(data.memory);
      setEvents(data.events);
      setDailyCare(ensureDailyCare(data.dailyCare, loadedAt));
      setJournal(data.journal ?? []);
      setSettings(data.settings);
    });
  }, []);

  async function persist(
    nextState: PetState,
    nextMemory = memory,
    nextEvents = events,
    nextDailyCare = dailyCare,
    nextJournal = journal,
  ) {
    await backend.saveAppData({
      profile,
      state: nextState,
      settings,
      memory: nextMemory,
      events: nextEvents,
      dailyCare: nextDailyCare,
      journal: nextJournal,
    });
  }

  function applyDailyProgress(kind: PetEvent['kind'], nextState: PetState, at: string) {
    const taskKind = taskForEventKind(kind);
    const activeCare = ensureDailyCare(dailyCare, at);
    if (!taskKind) return { state: nextState, care: activeCare };

    const reward = taskRewardFor(activeCare, taskKind);
    return {
      state: applyTaskRewardToState(nextState, reward),
      care: completeDailyTask(activeCare, taskKind, at),
    };
  }

  async function sendQuickMessage() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    const event = createPetEvent('chat', nowIso(), { userText: trimmed, intensity: 0.5 });
    const nextEvents = appendPetEvent(events, event);
    const applied = applyDailyProgress('chat', applyPetEvent(state, event, events), event.createdAt);
    const thinking = applied.state;
    setState(thinking);
    setEvents(nextEvents);
    setDailyCare(applied.care);
    setBubble('我在想一想...');

    try {
      const messages = buildPetMessages({ profile, state: thinking, memory, userText: trimmed });
      const response = await backend.sendPetChat({
        ...settings,
        messages,
      });
      const reply = mapAssistantTextToReply(response.text, thinking);
      const nextMemory = updateMemorySummary(memory, `用户说：${trimmed} 宠物回应：${reply.text}`, nowIso());
      setBubble(reply.text);
      setState(reply.nextState);
      setMemory(nextMemory);
      await persist(reply.nextState, nextMemory, nextEvents, applied.care);
    } catch (error) {
      const message = String(error);
      setBubble(message.toLowerCase().includes('api key') ? '我还没有接上大脑，先去设置 API key 吧。' : '我有点晕乎，等会儿再试试。');
      setState({ ...thinking, action: 'confused', mood: 'confused' });
    } finally {
      setText('');
      setBusy(false);
    }
  }

  function interact(kind: 'feed' | 'pet' | 'rest' | 'clean' | 'focus' | 'reflect') {
    const createdAt = nowIso();
    const event = createPetEvent(kind, createdAt, kind === 'focus' ? { note: '完成 25 分钟专注', quality: 0.85, intensity: 0.7 } : {});
    const nextEvents = appendPetEvent(events, event);
    const applied = applyDailyProgress(kind, applyPetEvent(state, event, events), createdAt);
    const next = applied.state;
    const nextJournal = kind === 'reflect'
      ? [
          ...journal.filter((entry) => entry.date !== createdAt.slice(0, 10)),
          createJournalEntry(createdAt, next, nextEvents, memory.facts),
        ].slice(-30)
      : journal;
    setState(next);
    setEvents(nextEvents);
    setDailyCare(applied.care);
    setJournal(nextJournal);
    setBubble(actionText(kind));
    void persist(next, memory, nextEvents, applied.care, nextJournal);
  }

  function startDrag(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('[data-no-drag], input, textarea, select, form')) return;
    void getCurrentWindow().startDragging().catch(() => undefined);
  }

  return (
    <main className="pet-window" onMouseDown={startDrag}>
      <div className="speech-bubble">{bubble}</div>
      <button
        aria-label={`拖动或点击${profile.name}`}
        className="pet-click-target"
        onClick={() => setInputOpen((open) => !open)}
      >
        <PetSprite action={state.action} avatar={profile.avatar} />
      </button>
      {inputOpen && (
        <form
          className="quick-chat"
          data-no-drag
          onSubmit={(event) => { event.preventDefault(); void sendQuickMessage(); }}
        >
          <input aria-label={`和${profile.name}说话`} value={text} onChange={(event) => setText(event.target.value)} />
          <button type="submit" disabled={busy}>发送</button>
        </form>
      )}
      <StatusBars state={state} />
      <div className="daily-care" data-no-drag>
        {dailyCare.tasks.map((task) => (
          <span key={task.id} className={task.completedAt ? 'task-done' : ''}>
            {task.completedAt ? '✓' : '·'} {task.label}
          </span>
        ))}
      </div>
      <div className="pet-actions" data-no-drag>
        <ActionButton label="快速对话" onClick={() => setInputOpen((open) => !open)}><MessageCircle size={18} /></ActionButton>
        <ActionButton label="喂食" onClick={() => interact('feed')}><Utensils size={18} /></ActionButton>
        <ActionButton label="摸摸" onClick={() => interact('pet')}><Heart size={18} /></ActionButton>
        <ActionButton label="清洁" onClick={() => interact('clean')}><Sparkles size={18} /></ActionButton>
        <ActionButton label="专注" onClick={() => interact('focus')}><Target size={18} /></ActionButton>
        <ActionButton label="休息" onClick={() => interact('rest')}><Moon size={18} /></ActionButton>
        <ActionButton label="日志" onClick={() => interact('reflect')}><BookOpen size={18} /></ActionButton>
      </div>
    </main>
  );
}

function actionText(kind: 'feed' | 'pet' | 'rest' | 'clean' | 'focus' | 'reflect') {
  if (kind === 'feed') return '好吃！今天的任务也记上啦。';
  if (kind === 'pet') return '嘿嘿，再摸一下。';
  if (kind === 'clean') return '亮晶晶！感觉精神了一点。';
  if (kind === 'focus') return '我陪你专注了一轮，金币到账。';
  if (kind === 'reflect') return '今天的小日记写好了。';
  return '我眯一会儿。';
}
