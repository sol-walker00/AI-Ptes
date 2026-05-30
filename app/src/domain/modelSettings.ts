import type { ModelSettings } from './petTypes';

export const defaultModelSettings: ModelSettings = {
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash',
  temperature: 0.7,
};

const legacyBuiltInModelSettings = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4.1-mini',
};

export function migrateBuiltInModelSettings(settings: ModelSettings): ModelSettings {
  if (
    settings.baseUrl === legacyBuiltInModelSettings.baseUrl
    && settings.model === legacyBuiltInModelSettings.model
  ) {
    return { ...settings, baseUrl: defaultModelSettings.baseUrl, model: defaultModelSettings.model };
  }

  return settings;
}
