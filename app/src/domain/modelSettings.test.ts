import { describe, expect, it } from 'vitest';
import {
  applyProviderPreset,
  defaultModelSettings,
  migrateBuiltInModelSettings,
  providerPresets,
} from './modelSettings';
import type { ModelSettings } from './petTypes';

describe('provider presets', () => {
  it('ships presets for mainstream providers and custom endpoints', () => {
    expect(providerPresets.map((preset) => preset.id)).toEqual([
      'deepseek',
      'openai',
      'anthropic',
      'gemini',
      'qwen',
      'kimi',
      'zai',
      'openrouter',
      'siliconflow',
      'ollama',
      'custom',
    ]);
  });

  it('keeps DeepSeek as the default provider', () => {
    expect(defaultModelSettings).toMatchObject({
      providerId: 'deepseek',
      protocol: 'openai-chat',
      auth: 'bearer',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-v4-flash',
    });
  });

  it('applies provider defaults when the provider changes', () => {
    expect(applyProviderPreset('anthropic')).toMatchObject({
      providerId: 'anthropic',
      protocol: 'anthropic-messages',
      auth: 'x-api-key',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-sonnet-4-20250514',
    });
  });

  it('migrates legacy built-in settings to the DeepSeek provider shape', () => {
    const legacySettings = {
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4.1-mini',
      temperature: 0.7,
    } as ModelSettings;

    expect(migrateBuiltInModelSettings(legacySettings)).toMatchObject({
      providerId: 'deepseek',
      protocol: 'openai-chat',
      auth: 'bearer',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-v4-flash',
    });
  });
});
