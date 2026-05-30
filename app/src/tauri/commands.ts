import { invoke } from '@tauri-apps/api/core';
import type { AppData, SendPetChatRequest, SendPetChatResponse } from './commandTypes';
import { emptyMemory } from '../domain/memory';
import { defaultModelSettings, migrateBuiltInModelSettings } from '../domain/modelSettings';
import { createInitialPetState } from '../domain/petState';

const devStorageKey = 'ai-pet-dev-app-data';

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
    },
    state: createInitialPetState(createdAt),
    settings: { ...defaultModelSettings },
    memory: emptyMemory(createdAt),
    events: [],
  };
}

function normalizeAppData(data: AppData): AppData {
  return {
    ...data,
    settings: migrateBuiltInModelSettings(data.settings),
    events: Array.isArray(data.events) ? data.events : [],
  };
}

function loadDevAppData() {
  const raw = localStorage.getItem(devStorageKey);
  if (!raw) return defaultAppData();

  try {
    return normalizeAppData(JSON.parse(raw) as AppData);
  } catch {
    localStorage.removeItem(devStorageKey);
    return defaultAppData();
  }
}

function saveDevAppData(data: AppData) {
  localStorage.setItem(devStorageKey, JSON.stringify(data));
  return data;
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
  loadAppData: () => runCommand<AppData>('load_app_data', undefined, loadDevAppData),
  saveAppData: (data: AppData) => runCommand<AppData>('save_app_data', { data }, () => saveDevAppData(data)),
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
