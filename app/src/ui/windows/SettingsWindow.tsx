import { useEffect, useRef, useState } from 'react';
import { createInitialPetState } from '../../domain/petState';
import { emptyMemory } from '../../domain/memory';
import type { MemorySummary, ModelSettings, PetEvent, PetPersonaId, PetProfile, PetState } from '../../domain/petTypes';
import { backend } from '../../tauri/commands';

const nowIso = () => new Date().toISOString();
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);

export function SettingsWindow() {
  const initialCreatedAt = nowIso();
  const [name, setName] = useState('桃桃');
  const [species, setSpecies] = useState('桌面小猫');
  const [personaId, setPersonaId] = useState<PetPersonaId>('healing');
  const [createdAt, setCreatedAt] = useState(initialCreatedAt);
  const [petState, setPetState] = useState<PetState>(() => createInitialPetState(initialCreatedAt));
  const [memory, setMemory] = useState<MemorySummary>(() => emptyMemory(initialCreatedAt));
  const [events, setEvents] = useState<PetEvent[]>([]);
  const [settings, setSettings] = useState<ModelSettings>({
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    temperature: 0.7,
  });
  const [apiKey, setApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    backend.loadAppData().then((data) => {
      if (data.profile) {
        setName(data.profile.name);
        setSpecies(data.profile.species);
        setPersonaId(data.profile.personaId);
        setCreatedAt(data.profile.createdAt);
      }
      if (data.state) setPetState(data.state);
      setMemory(data.memory);
      setEvents(data.events);
      setSettings(data.settings);
    });
    backend.getApiKeyStatus().then(setKeyStatus);
  }, []);

  async function save() {
    if (savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    setMessage('');

    try {
      const profile: PetProfile = { name, species, personaId, createdAt };
      if (apiKey.trim()) {
        const masked = await backend.saveApiKey(apiKey.trim());
        setKeyStatus(masked);
        setApiKey('');
      }
      await backend.saveAppData({
        profile,
        state: petState,
        settings,
        memory,
        events,
      });
      setMessage('设置已保存');
    } catch (error) {
      setMessage(`保存失败：${errorText(error)}`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
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
      <label>
        Base URL
        <input value={settings.baseUrl} onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })} />
      </label>
      <label>
        模型
        <input value={settings.model} onChange={(event) => setSettings({ ...settings, model: event.target.value })} />
      </label>
      <label>
        API key
        <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
      </label>
      {keyStatus && <p className="key-status">{keyStatus}</p>}
      {message && <p className="save-message" role="status">{message}</p>}
      <button className="primary-button" onClick={() => void save()} disabled={saving}>
        {saving ? '保存中...' : '保存设置'}
      </button>
    </main>
  );
}
