import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { AppData, AppDataSnapshot, SendPetChatRequest, SendPetChatResponse } from './commandTypes';
import { defaultPetAvatar, normalizePetAvatar } from '../domain/petAvatar';
import { emptyMemory } from '../domain/memory';
import { defaultModelSettings, migrateBuiltInModelSettings } from '../domain/modelSettings';
import { ensureDailyCare } from '../domain/petLifecycle';
import { createInitialPetState, normalizePetState } from '../domain/petState';

const devStorageKey = 'ai-pet-dev-app-data';
const appDataUpdatedEvent = 'app-data-updated';
let devRevision = 0;

function isTauriRuntime() {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

function nowIso() {
  return new Date().toISOString();
}

function defaultAppData(): AppData {
  const createdAt = nowIso();
  return {
    profile: {
      name: '桃桃',
      species: '桌面小猫',
      personaId: 'healing',
      createdAt,
      avatar: defaultPetAvatar(),
    },
    state: createInitialPetState(createdAt),
    settings: { ...defaultModelSettings },
    memory: emptyMemory(createdAt),
    events: [],
    dailyCare: ensureDailyCare(undefined, createdAt),
    journal: [],
  };
}

function normalizeAppData(data: AppData): AppData {
  const now = nowIso();
  return {
    ...data,
    profile: data.profile ? { ...data.profile, avatar: normalizePetAvatar(data.profile.avatar) } : data.profile,
    state: data.state ? normalizePetState(data.state, now) : data.state,
    settings: migrateBuiltInModelSettings(data.settings),
    events: Array.isArray(data.events) ? data.events : [],
    dailyCare: ensureDailyCare(data.dailyCare, now),
    journal: Array.isArray(data.journal) ? data.journal : [],
  };
}

function normalizeAppDataSnapshot(snapshot: AppDataSnapshot): AppDataSnapshot {
  return {
    data: normalizeAppData(snapshot.data),
    revision: snapshot.revision,
  };
}

function loadDevAppData() {
  const raw = localStorage.getItem(devStorageKey);
  if (!raw) {
    devRevision = 0;
    return defaultAppData();
  }

  try {
    return normalizeAppData(JSON.parse(raw) as AppData);
  } catch {
    localStorage.removeItem(devStorageKey);
    devRevision = 0;
    return defaultAppData();
  }
}

function loadDevAppDataSnapshot(): AppDataSnapshot {
  return {
    data: loadDevAppData(),
    revision: devRevision,
  };
}

function saveDevAppData(data: AppData) {
  if (!localStorage.getItem(devStorageKey)) {
    devRevision = 0;
  }
  localStorage.setItem(devStorageKey, JSON.stringify(data));
  devRevision += 1;
  window.dispatchEvent(new CustomEvent<AppDataSnapshot>(appDataUpdatedEvent, {
    detail: { data, revision: devRevision },
  }));
  return data;
}

function saveDevAppDataIfCurrent(data: AppData, expectedRevision: number) {
  if (devRevision !== expectedRevision) {
    return Promise.reject(new Error('app data changed'));
  }
  return saveDevAppData(data);
}

async function runCommand<T>(command: string, args?: Record<string, unknown>, fallback?: () => T | Promise<T>) {
  if (isTauriRuntime()) {
    return invoke<T>(command, args);
  }

  if (!fallback) {
    throw new Error('This command is only available inside the desktop app.');
  }

  return fallback();
}

export const backend = {
  loadAppData: async () => normalizeAppData(await runCommand<AppData>('load_app_data', undefined, loadDevAppData)),
  loadAppDataSnapshot: async () => normalizeAppDataSnapshot(
    await runCommand<AppDataSnapshot>('load_app_data_snapshot', undefined, loadDevAppDataSnapshot),
  ),
  saveAppData: (data: AppData) => runCommand<AppData>('save_app_data', { data }, () => saveDevAppData(data)),
  saveAppDataIfCurrent: (data: AppData, expectedRevision: number) =>
    runCommand<AppData>(
      'save_app_data_if_current',
      { data, expectedRevision },
      () => saveDevAppDataIfCurrent(data, expectedRevision),
    ),
  subscribeAppDataSnapshotUpdates: async (callback: (snapshot: AppDataSnapshot) => void) => {
    if (isTauriRuntime()) {
      return listen<AppDataSnapshot>(appDataUpdatedEvent, (event) => callback(normalizeAppDataSnapshot(event.payload)));
    }

    const handler = (event: Event) => {
      callback(normalizeAppDataSnapshot((event as CustomEvent<AppDataSnapshot>).detail));
    };
    window.addEventListener(appDataUpdatedEvent, handler);
    return () => window.removeEventListener(appDataUpdatedEvent, handler);
  },
  subscribeAppDataUpdates: async (callback: (data: AppData) => void) => {
    if (isTauriRuntime()) {
      return listen<AppDataSnapshot>(appDataUpdatedEvent, (event) => callback(normalizeAppData(event.payload.data)));
    }

    const handler = (event: Event) => {
      callback(normalizeAppData((event as CustomEvent<AppDataSnapshot>).detail.data));
    };
    window.addEventListener(appDataUpdatedEvent, handler);
    return () => window.removeEventListener(appDataUpdatedEvent, handler);
  },
  saveApiKey: (providerId: string, apiKey: string) =>
    runCommand<string>('save_api_key', { providerId, apiKey }, () => `已保存 ****${apiKey.slice(-4)}`),
  clearApiKey: (providerId: string) => runCommand<void>('clear_api_key', { providerId }, () => undefined),
  getApiKeyStatus: (providerId: string) => runCommand<string | null>('get_api_key_status', { providerId }, () => null),
  testProviderConnection: (settings: AppData['settings'], apiKey?: string) =>
    runCommand<string>('test_provider_connection', {
      request: {
        ...settings,
        messages: [
          { role: 'system', content: '你是桌面宠物连接测试。' },
          { role: 'user', content: '请回复 OK。' },
        ],
      },
      apiKey: apiKey || null,
    }, () => '连接成功'),
  sendPetChat: (request: SendPetChatRequest) =>
    runCommand<SendPetChatResponse>('send_pet_chat', { request }, () => ({
      text: '预览模式下我先用本地回复陪你。放进桌面 App 后，就会用你设置的 API key 和模型来回答。',
    })),
};
