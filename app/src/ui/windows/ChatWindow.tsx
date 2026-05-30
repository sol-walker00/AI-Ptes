import { useEffect, useRef, useState } from 'react';
import { normalizePetAvatar } from '../../domain/petAvatar';
import { buildPetMessages, mapAssistantTextToReply } from '../../domain/petBrain';
import { defaultModelSettings } from '../../domain/modelSettings';
import { applyTaskRewardToState, completeDailyTask, ensureDailyCare, taskRewardFor } from '../../domain/petLifecycle';
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
import type { AppData, AppDataSnapshot, UiChatMessage } from '../../tauri/commandTypes';
import { MessageList } from '../components/MessageList';

const nowIso = () => new Date().toISOString();
const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function ChatWindow() {
  const [profile, setProfile] = useState<PetProfile | null>(null);
  const [state, setState] = useState<PetState>(() => createInitialPetState(nowIso()));
  const [memory, setMemory] = useState<MemorySummary>(() => emptyMemory(nowIso()));
  const [events, setEvents] = useState<PetEvent[]>([]);
  const [dailyCare, setDailyCare] = useState<DailyCare>(() => ensureDailyCare(undefined, nowIso()));
  const [journal, setJournal] = useState<PetJournalEntry[]>([]);
  const [settings, setSettings] = useState<ModelSettings>({ ...defaultModelSettings });
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const dataVersionRef = useRef(0);
  const appRevisionRef = useRef(0);
  const profileRef = useRef<PetProfile | null>(null);

  function applyAppDataSnapshot(snapshot: AppDataSnapshot) {
    appRevisionRef.current = snapshot.revision;
    applyAppData(snapshot.data);
  }

  function applyAppData(data: AppData) {
    dataVersionRef.current += 1;
    const loadedAt = nowIso();
    if (data.profile) {
      const nextProfile = { ...data.profile, avatar: normalizePetAvatar(data.profile.avatar) };
      profileRef.current = nextProfile;
      setProfile(nextProfile);
    } else {
      profileRef.current = null;
      setProfile(null);
    }
    if (data.state) {
      setState(restoreStateAfterTime(normalizePetState(data.state, loadedAt), loadedAt));
    } else if (data.profile) {
      setState(createInitialPetState(data.profile.createdAt));
    }
    setMemory(data.memory);
    setEvents(data.events);
    setDailyCare(ensureDailyCare(data.dailyCare, loadedAt));
    setJournal(data.journal ?? []);
    setSettings(data.settings);
  }

  async function reloadLatestAppData() {
    applyAppDataSnapshot(await backend.loadAppDataSnapshot());
  }

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;

    async function loadAfterSubscriptionReady() {
      try {
        const unlisten = await backend.subscribeAppDataSnapshotUpdates((snapshot) => {
          if (!disposed) applyAppDataSnapshot(snapshot);
        });
        if (disposed) {
          unlisten();
          return;
        }
        unsubscribe = unlisten;

        const initialVersion = dataVersionRef.current;
        const snapshot = await backend.loadAppDataSnapshot();
        if (!disposed && dataVersionRef.current === initialVersion) {
          applyAppDataSnapshot(snapshot);
        }
      } catch {
        if (disposed) return;
        const initialVersion = dataVersionRef.current;
        const snapshot = await backend.loadAppDataSnapshot();
        if (!disposed && dataVersionRef.current === initialVersion) {
          applyAppDataSnapshot(snapshot);
        }
      }
    }

    void loadAfterSubscriptionReady();

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

  async function send() {
    if (!profile) return;

    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const requestVersion = dataVersionRef.current;
    const requestRevision = appRevisionRef.current;
    const requestProfile = profile;
    const requestState = state;
    const requestMemory = memory;
    const requestEvents = events;
    const requestDailyCare = dailyCare;
    const requestJournal = journal;
    const requestSettings = settings;

    const userMessage: UiChatMessage = { id: id(), role: 'user', content: trimmed, createdAt: nowIso() };
    setMessages((current) => [...current, userMessage]);
    setText('');
    setBusy(true);
    const event = createPetEvent('chat', nowIso(), { userText: trimmed, intensity: 0.5 });
    const nextEvents = appendPetEvent(requestEvents, event);
    const activeCare = ensureDailyCare(requestDailyCare, event.createdAt);
    const reward = taskRewardFor(activeCare, 'chat');
    const nextDailyCare = completeDailyTask(activeCare, 'chat', event.createdAt);
    const thinking = applyTaskRewardToState(applyPetEvent(requestState, event, requestEvents), reward);
    setState(thinking);
    setEvents(nextEvents);
    setDailyCare(nextDailyCare);

    try {
      const aiMessages = buildPetMessages({ profile: requestProfile, state: thinking, memory: requestMemory, userText: trimmed });
      const response = await backend.sendPetChat({
        ...requestSettings,
        messages: aiMessages,
      });
      if (dataVersionRef.current !== requestVersion || profileRef.current !== requestProfile) return;
      const reply = mapAssistantTextToReply(response.text, thinking);
      const nextMemory = updateMemorySummary(requestMemory, `用户说：${trimmed} 宠物回应：${reply.text}`, nowIso());
      const petMessage: UiChatMessage = { id: id(), role: 'pet', content: reply.text, createdAt: nowIso() };
      setMessages((current) => [...current, petMessage]);
      setState(reply.nextState);
      setMemory(nextMemory);
      const snapshot = await backend.saveAppDataIfCurrent({
        profile: requestProfile,
        state: reply.nextState,
        settings: requestSettings,
        memory: nextMemory,
        events: nextEvents,
        dailyCare: nextDailyCare,
        journal: requestJournal,
      }, requestRevision);
      applyAppDataSnapshot(snapshot);
    } catch (error) {
      if (isAppDataChangedError(error)) {
        await reloadLatestAppData();
        return;
      }
      if (dataVersionRef.current !== requestVersion || profileRef.current !== requestProfile) return;
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
        {profile ? (
          <>
            <h1>和{profile.name}聊天</h1>
            <p>{profile.species} · {state.mood}</p>
          </>
        ) : (
          <>
            <h1>还没有宠物住进来。</h1>
            <p>去设置窗口导入 adoption.pet 后再来聊天。</p>
          </>
        )}
      </header>
      <MessageList messages={messages} />
      <form className="chat-form" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        <label>
          聊天输入
          <textarea value={text} onChange={(event) => setText(event.target.value)} disabled={!profile} />
        </label>
        <button className="primary-button" type="submit" disabled={busy || !profile} aria-label="发送消息">发送</button>
      </form>
    </main>
  );
}

function isAppDataChangedError(error: unknown) {
  return String(error).includes('app data changed');
}
