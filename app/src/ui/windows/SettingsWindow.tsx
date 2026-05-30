import { useEffect, useRef, useState } from 'react';
import { defaultPetAvatar, normalizePetAvatar } from '../../domain/petAvatar';
import type { AdoptedAppData } from '../../domain/petAdoption';
import { createInitialPetState, normalizePetState, restoreStateAfterTime } from '../../domain/petState';
import { ensureDailyCare } from '../../domain/petLifecycle';
import { emptyMemory } from '../../domain/memory';
import {
  applyProviderPreset,
  defaultModelSettings,
  findProviderPreset,
  providerPresets,
} from '../../domain/modelSettings';
import type {
  PetAvatar,
  MemorySummary,
  DailyCare,
  ModelSettings,
  PetEvent,
  PetJournalEntry,
  PetPersonaId,
  PetProfile,
  PetState,
  ProviderAuth,
  ProviderProtocol,
} from '../../domain/petTypes';
import { backend } from '../../tauri/commands';
import type { AppData } from '../../tauri/commandTypes';
import { AdoptionImportPanel } from '../components/AdoptionImportPanel';
import { AvatarCustomizer } from '../components/AvatarCustomizer';

const nowIso = () => new Date().toISOString();
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
const appDataChanged = (error: unknown) => errorText(error).includes('app data changed');

export function SettingsWindow() {
  const initialCreatedAt = nowIso();
  const [name, setName] = useState('桃桃');
  const [species, setSpecies] = useState('桌面小猫');
  const [personaId, setPersonaId] = useState<PetPersonaId>('healing');
  const [avatar, setAvatar] = useState<PetAvatar>(() => defaultPetAvatar());
  const [createdAt, setCreatedAt] = useState(initialCreatedAt);
  const [petState, setPetState] = useState<PetState>(() => createInitialPetState(initialCreatedAt));
  const [memory, setMemory] = useState<MemorySummary>(() => emptyMemory(initialCreatedAt));
  const [events, setEvents] = useState<PetEvent[]>([]);
  const [dailyCare, setDailyCare] = useState<DailyCare>(() => ensureDailyCare(undefined, initialCreatedAt));
  const [journal, setJournal] = useState<PetJournalEntry[]>([]);
  const [settings, setSettings] = useState<ModelSettings>({ ...defaultModelSettings });
  const [apiKey, setApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [hasLocalProfile, setHasLocalProfile] = useState(true);
  const [showLocalCreate, setShowLocalCreate] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    backend.loadAppData().then((data) => {
      const loadedAt = nowIso();
      if (data.profile) {
        setHasLocalProfile(true);
        setName(data.profile.name);
        setSpecies(data.profile.species);
        setPersonaId(data.profile.personaId);
        setAvatar(normalizePetAvatar(data.profile.avatar));
        setCreatedAt(data.profile.createdAt);
      } else {
        setHasLocalProfile(false);
      }
      if (data.state) setPetState(restoreStateAfterTime(normalizePetState(data.state, loadedAt), loadedAt));
      setMemory(data.memory);
      setEvents(data.events);
      setDailyCare(ensureDailyCare(data.dailyCare, loadedAt));
      setJournal(data.journal ?? []);
      setSettings(data.settings);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setKeyStatus(null);
    backend.getApiKeyStatus(settings.providerId).then((status) => {
      if (!cancelled) setKeyStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [settings.providerId]);

  function changeProvider(providerId: string) {
    setSettings(applyProviderPreset(providerId, settings));
    setApiKey('');
    setMessage('');
  }

  function changeProtocol(protocol: ProviderProtocol) {
    setSettings({
      ...settings,
      protocol,
      auth: protocol === 'anthropic-messages' ? 'x-api-key' : settings.auth,
    });
  }

  async function testConnection() {
    if (testing) return;

    setTesting(true);
    setMessage('');

    try {
      const trimmedKey = apiKey.trim();
      const result = trimmedKey
        ? await backend.testProviderConnection(settings, trimmedKey)
        : await backend.testProviderConnection(settings);
      setMessage(result);
    } catch (error) {
      setMessage(`连接失败：${errorText(error)}`);
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    if (savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    setMessage('');

    try {
      const profile: PetProfile = { name, species, personaId, avatar, createdAt };
      if (apiKey.trim()) {
        const masked = await backend.saveApiKey(settings.providerId, apiKey.trim());
        setKeyStatus(masked);
        setApiKey('');
      }
      const savedData = hasLocalProfile
        ? await saveSettingsOverLatestData(profile)
        : await backend.saveAppData({
            profile,
            state: petState,
            settings,
            memory,
            events,
            dailyCare,
            journal,
          });
      syncLocalAppData(savedData);
      setHasLocalProfile(true);
      setMessage('设置已保存');
    } catch (error) {
      setMessage(`保存失败：${errorText(error)}`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function saveSettingsOverLatestData(profile: PetProfile): Promise<AppData> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const snapshot = await backend.loadAppDataSnapshot();
      const nextData: AppData = {
        ...snapshot.data,
        profile,
        settings,
        events: snapshot.data.events,
        dailyCare: snapshot.data.dailyCare ?? null,
        journal: snapshot.data.journal ?? [],
      };

      try {
        return (await backend.saveAppDataIfCurrent(nextData, snapshot.revision)).data;
      } catch (error) {
        if (appDataChanged(error) && attempt === 0) continue;
        throw error;
      }
    }

    throw new Error('app data changed');
  }

  function syncLocalAppData(data: AppData) {
    const loadedAt = nowIso();
    if (data.state) setPetState(restoreStateAfterTime(normalizePetState(data.state, loadedAt), loadedAt));
    setMemory(data.memory);
    setEvents(data.events);
    setDailyCare(ensureDailyCare(data.dailyCare, loadedAt));
    setJournal(data.journal ?? []);
  }

  async function importAdoptedPet(data: AdoptedAppData) {
    await backend.saveAppData(data);
    setName(data.profile.name);
    setSpecies(data.profile.species);
    setPersonaId(data.profile.personaId);
    setAvatar(data.profile.avatar);
    setCreatedAt(data.profile.createdAt);
    setPetState(data.state);
    setMemory(data.memory);
    setEvents(data.events);
    setDailyCare(data.dailyCare);
    setJournal(data.journal);
    setSettings(data.settings);
    setMessage(`${data.profile.name} 已准备回家。`);
    setHasLocalProfile(true);
    setShowLocalCreate(false);
  }

  const selectedPreset = findProviderPreset(settings.providerId);
  const showApiKey = settings.auth !== 'none';

  if (!hasLocalProfile && !showLocalCreate) {
    return (
      <main className="panel-window settings-window">
        <AdoptionImportPanel
          onImport={importAdoptedPet}
          onCreateLocally={() => {
            const createdAt = nowIso();
            setCreatedAt(createdAt);
            setPetState(createInitialPetState(createdAt));
            setMemory(emptyMemory(createdAt));
            setDailyCare(ensureDailyCare(undefined, createdAt));
            setShowLocalCreate(true);
          }}
        />
      </main>
    );
  }

  return (
    <main className="panel-window settings-window">
      <h1>宠物核心</h1>
      <label>
        宠物名字
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        宠物形象
        <input value={species} onChange={(event) => setSpecies(event.target.value)} />
      </label>
      <label>
        性格
        <select value={personaId} onChange={(event) => setPersonaId(event.target.value as PetPersonaId)}>
          <option value="healing">治愈</option>
          <option value="tsundere">嘴硬</option>
          <option value="studyBuddy">学习搭子</option>
          <option value="energetic">元气陪伴</option>
        </select>
      </label>
      <AvatarCustomizer avatar={avatar} onChange={setAvatar} />
      <section className="settings-section">
        <h2>模型供应商</h2>
        <label>
          供应商
          <select value={settings.providerId} onChange={(event) => changeProvider(event.target.value)}>
            {providerPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          模型
          <input value={settings.model} onChange={(event) => setSettings({ ...settings, model: event.target.value })} />
        </label>
        {showApiKey && (
          <label>
            API key
            <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
          </label>
        )}
        {keyStatus && showApiKey && <p className="key-status">{selectedPreset.label}：{keyStatus}</p>}
        {!selectedPreset.requiresApiKey && <p className="key-status">这个供应商默认不需要 API key。</p>}
        <div className="settings-actions">
          <button className="secondary-button" type="button" onClick={() => void testConnection()} disabled={testing}>
            {testing ? '测试中...' : '测试连接'}
          </button>
          <button className="secondary-button" type="button" onClick={() => setAdvancedOpen((open) => !open)}>
            高级设置
          </button>
        </div>
      </section>
      {advancedOpen && (
        <section className="settings-section">
          <h2>高级设置</h2>
          <label>
            Base URL
            <input value={settings.baseUrl} onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })} />
          </label>
          <label>
            协议
            <select
              value={settings.protocol}
              onChange={(event) => changeProtocol(event.target.value as ProviderProtocol)}
              disabled={settings.providerId !== 'custom'}
            >
              <option value="openai-chat">OpenAI Chat Completions</option>
              <option value="openai-responses">OpenAI Responses</option>
              <option value="anthropic-messages">Anthropic Messages</option>
              <option value="gemini-openai">Gemini OpenAI Compatibility</option>
            </select>
          </label>
          {settings.providerId === 'custom' && (
            <label>
              鉴权
              <select
                value={settings.auth}
                onChange={(event) => setSettings({ ...settings, auth: event.target.value as ProviderAuth })}
              >
                <option value="bearer">Bearer</option>
                <option value="x-api-key">x-api-key</option>
                <option value="none">无</option>
              </select>
            </label>
          )}
        </section>
      )}
      {message && <p className="save-message" role="status">{message}</p>}
      <button className="primary-button" onClick={() => void save()} disabled={saving}>
        {saving ? '保存中...' : '保存设置'}
      </button>
    </main>
  );
}
