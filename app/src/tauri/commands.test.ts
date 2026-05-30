import { beforeEach, describe, expect, it } from 'vitest';
import { backend } from './commands';

describe('backend browser fallback', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('recovers default app data when preview storage is corrupted', async () => {
    localStorage.setItem('ai-pet-dev-app-data', '{not valid json');

    const data = await backend.loadAppData();

    expect(data.profile?.name).toBe('桃桃');
    expect(data.state?.mood).toBe('calm');
    expect(data.events).toEqual([]);
    expect(localStorage.getItem('ai-pet-dev-app-data')).toBeNull();
  });

  it('normalizes legacy preview data without an event log', async () => {
    localStorage.setItem('ai-pet-dev-app-data', JSON.stringify({
      profile: null,
      state: null,
      settings: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', temperature: 0.7 },
      memory: { facts: [], recentSummary: '', updatedAt: '2026-05-30T00:00:00.000Z' },
    }));

    const data = await backend.loadAppData();

    expect(data.events).toEqual([]);
  });
});
