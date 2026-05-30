import type { ModelSettings, ProviderAuth, ProviderProtocol } from './petTypes';

export interface ProviderPreset {
  id: string;
  label: string;
  protocol: ProviderProtocol;
  auth: ProviderAuth;
  baseUrl: string;
  model: string;
  keychainAccount: string;
  requiresApiKey: boolean;
  supportsModelList: boolean;
}

export const providerPresets: ProviderPreset[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    protocol: 'openai-chat',
    auth: 'bearer',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    keychainAccount: 'provider-deepseek-api-key',
    requiresApiKey: true,
    supportsModelList: true,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    protocol: 'openai-responses',
    auth: 'bearer',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5-mini',
    keychainAccount: 'provider-openai-api-key',
    requiresApiKey: true,
    supportsModelList: true,
  },
  {
    id: 'anthropic',
    label: 'Claude / Anthropic',
    protocol: 'anthropic-messages',
    auth: 'x-api-key',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-20250514',
    keychainAccount: 'provider-anthropic-api-key',
    requiresApiKey: true,
    supportsModelList: true,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    protocol: 'gemini-openai',
    auth: 'bearer',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
    keychainAccount: 'provider-gemini-api-key',
    requiresApiKey: true,
    supportsModelList: true,
  },
  {
    id: 'qwen',
    label: 'Qwen / 百炼',
    protocol: 'openai-chat',
    auth: 'bearer',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3.6-plus',
    keychainAccount: 'provider-qwen-api-key',
    requiresApiKey: true,
    supportsModelList: true,
  },
  {
    id: 'kimi',
    label: 'Kimi / Moonshot',
    protocol: 'openai-chat',
    auth: 'bearer',
    baseUrl: 'https://api.moonshot.ai/v1',
    model: 'kimi-k2.6',
    keychainAccount: 'provider-kimi-api-key',
    requiresApiKey: true,
    supportsModelList: true,
  },
  {
    id: 'zai',
    label: 'Z.AI / GLM',
    protocol: 'openai-chat',
    auth: 'bearer',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    model: 'glm-5.1',
    keychainAccount: 'provider-zai-api-key',
    requiresApiKey: true,
    supportsModelList: true,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    protocol: 'openai-chat',
    auth: 'bearer',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openrouter/auto',
    keychainAccount: 'provider-openrouter-api-key',
    requiresApiKey: true,
    supportsModelList: true,
  },
  {
    id: 'siliconflow',
    label: 'SiliconFlow / 硅基流动',
    protocol: 'openai-chat',
    auth: 'bearer',
    baseUrl: 'https://api.siliconflow.com/v1',
    model: 'Qwen/Qwen3-32B',
    keychainAccount: 'provider-siliconflow-api-key',
    requiresApiKey: true,
    supportsModelList: true,
  },
  {
    id: 'ollama',
    label: 'Ollama / 本地',
    protocol: 'openai-chat',
    auth: 'none',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
    keychainAccount: 'provider-ollama-api-key',
    requiresApiKey: false,
    supportsModelList: true,
  },
  {
    id: 'custom',
    label: '自定义',
    protocol: 'openai-chat',
    auth: 'bearer',
    baseUrl: 'https://example.com/v1',
    model: 'model-id',
    keychainAccount: 'provider-custom-api-key',
    requiresApiKey: true,
    supportsModelList: false,
  },
];

export function findProviderPreset(providerId: string) {
  return providerPresets.find((preset) => preset.id === providerId) ?? providerPresets[0];
}

export function applyProviderPreset(providerId: string, current?: ModelSettings): ModelSettings {
  const preset = findProviderPreset(providerId);
  const customHeaders = current?.providerId === providerId ? current.customHeaders : {};

  return {
    providerId: preset.id,
    protocol: preset.protocol,
    auth: preset.auth,
    baseUrl: preset.baseUrl,
    model: preset.model,
    temperature: current?.temperature ?? 0.7,
    customHeaders,
  };
}

export const defaultModelSettings: ModelSettings = {
  ...applyProviderPreset('deepseek'),
};

const legacyBuiltInModelSettings = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4.1-mini',
};

export function migrateBuiltInModelSettings(settings: ModelSettings): ModelSettings {
  const providerId = settings.providerId || inferProviderId(settings.baseUrl);
  const normalized: ModelSettings = {
    ...settings,
    providerId,
    protocol: settings.protocol || findProviderPreset(providerId).protocol,
    auth: settings.auth || findProviderPreset(providerId).auth,
    customHeaders: settings.customHeaders || {},
  };

  if (
    normalized.baseUrl === legacyBuiltInModelSettings.baseUrl
    && normalized.model === legacyBuiltInModelSettings.model
  ) {
    return { ...defaultModelSettings, temperature: normalized.temperature };
  }

  return normalized;
}

function inferProviderId(baseUrl: string) {
  const normalized = baseUrl.toLowerCase();
  if (normalized.includes('deepseek.com')) return 'deepseek';
  if (normalized.includes('api.openai.com')) return 'openai';
  if (normalized.includes('anthropic.com')) return 'anthropic';
  if (normalized.includes('generativelanguage.googleapis.com')) return 'gemini';
  if (normalized.includes('dashscope')) return 'qwen';
  if (normalized.includes('moonshot.ai')) return 'kimi';
  if (normalized.includes('api.z.ai')) return 'zai';
  if (normalized.includes('openrouter.ai')) return 'openrouter';
  if (normalized.includes('siliconflow')) return 'siliconflow';
  if (normalized.includes('localhost:11434') || normalized.includes('127.0.0.1:11434')) return 'ollama';
  return 'custom';
}
