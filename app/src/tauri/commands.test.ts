import { beforeEach, describe, expect, it } from 'vitest';
import { backend } from './commands';

describe('backend browser fallback', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('recovers default app data when preview storage is corrupted', async () => {
    localStorage.setItem('ai-pet-dev-app-data', '{not valid json');

    const data = await backend.loadAppData();

    expect(data.profile).toBeNull();
    expect(data.state).toBeNull();
    expect(data.settings.providerId).toBe('deepseek');
    expect(data.settings.protocol).toBe('openai-chat');
    expect(data.settings.auth).toBe('bearer');
    expect(data.settings.baseUrl).toBe('https://api.deepseek.com');
    expect(data.settings.model).toBe('deepseek-v4-flash');
    expect(data.events).toEqual([]);
    expect(data.dailyCare?.tasks.map((task) => task.kind)).toEqual(['feed', 'chat', 'focus', 'rest', 'reflect']);
    expect(data.journal).toEqual([]);
    expect(localStorage.getItem('ai-pet-dev-app-data')).toBeNull();
  });

  it('normalizes legacy preview data without an event log', async () => {
    localStorage.setItem('ai-pet-dev-app-data', JSON.stringify({
      profile: null,
      state: null,
      settings: {
        providerId: 'deepseek',
        protocol: 'openai-chat',
        auth: 'bearer',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-v4-flash',
        temperature: 0.7,
        customHeaders: {},
      },
      memory: { facts: [], recentSummary: '', updatedAt: '2026-05-30T00:00:00.000Z' },
    }));

    const data = await backend.loadAppData();

    expect(data.events).toEqual([]);
    expect(data.dailyCare?.tasks.map((task) => task.kind)).toEqual(['feed', 'chat', 'focus', 'rest', 'reflect']);
    expect(data.journal).toEqual([]);
  });

  it('migrates old built-in provider defaults to DeepSeek', async () => {
    localStorage.setItem('ai-pet-dev-app-data', JSON.stringify({
      profile: null,
      state: null,
      settings: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', temperature: 0.7 },
      memory: { facts: [], recentSummary: '', updatedAt: '2026-05-30T00:00:00.000Z' },
      events: [],
    }));

    const data = await backend.loadAppData();

    expect(data.settings.baseUrl).toBe('https://api.deepseek.com');
    expect(data.settings.model).toBe('deepseek-v4-flash');
    expect(data.settings.providerId).toBe('deepseek');
  });

  it('notifies preview subscribers when app data is saved', async () => {
    const updates = [];
    const unsubscribe = await backend.subscribeAppDataUpdates((data) => updates.push(data));

    await backend.saveAppData({
      profile: {
        name: '米糕',
        species: '桌面小兔',
        personaId: 'studyBuddy',
        createdAt: '2026-05-30T12:00:00.000Z',
        avatar: {
          body: 'bunny',
          primaryColor: '#9fd7ff',
          secondaryColor: '#e4f5ff',
          eyeStyle: 'sparkle',
          mouthStyle: 'smile',
          cheekStyle: 'peach',
          accessory: 'headphones',
        },
      },
      state: null,
      settings: {
        providerId: 'deepseek',
        protocol: 'openai-chat',
        auth: 'bearer',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-v4-flash',
        temperature: 0.7,
        customHeaders: {},
      },
      memory: { facts: [], recentSummary: '', updatedAt: '2026-05-30T12:00:00.000Z' },
      events: [],
      dailyCare: null,
      journal: [],
    });

    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual(expect.objectContaining({
      profile: expect.objectContaining({
        name: '米糕',
        avatar: expect.objectContaining({ body: 'bunny', accessory: 'headphones' }),
      }),
      events: [],
      dailyCare: expect.objectContaining({
        tasks: expect.arrayContaining([expect.objectContaining({ kind: 'feed' })]),
      }),
      journal: [],
    }));

    unsubscribe();
  });

  it('tracks preview app data snapshot revisions', async () => {
    const snapshot = await backend.loadAppDataSnapshot();

    expect(snapshot.revision).toBe(0);
    expect(snapshot.data.profile).toBeNull();

    const saved = await backend.saveAppData({
      ...snapshot.data,
      profile: {
        name: '米糕',
        species: '桌面小兔',
        personaId: 'studyBuddy',
        createdAt: '2026-05-30T12:00:00.000Z',
        avatar: {
          body: 'bunny',
          primaryColor: '#9fd7ff',
          secondaryColor: '#e4f5ff',
          eyeStyle: 'sparkle',
          mouthStyle: 'smile',
          cheekStyle: 'peach',
          accessory: 'headphones',
        },
      },
    });
    const nextSnapshot = await backend.loadAppDataSnapshot();

    expect(saved.profile?.name).toBe('米糕');
    expect(nextSnapshot.revision).toBe(1);
    expect(nextSnapshot.data.profile?.name).toBe('米糕');
  });

  it('rejects stale preview compare-and-save without notifying or overwriting', async () => {
    const updates = [];
    const unsubscribe = await backend.subscribeAppDataSnapshotUpdates((snapshot) => updates.push(snapshot));
    const snapshot = await backend.loadAppDataSnapshot();
    await backend.saveAppData({
      ...snapshot.data,
      profile: {
        name: '米糕',
        species: '桌面小兔',
        personaId: 'studyBuddy',
        createdAt: '2026-05-30T12:00:00.000Z',
        avatar: {
          body: 'bunny',
          primaryColor: '#9fd7ff',
          secondaryColor: '#e4f5ff',
          eyeStyle: 'sparkle',
          mouthStyle: 'smile',
          cheekStyle: 'peach',
          accessory: 'headphones',
        },
      },
    });

    await expect(backend.saveAppDataIfCurrent({
      ...snapshot.data,
      profile: {
        name: '旧桃桃',
        species: '桌面小猫',
        personaId: 'healing',
        createdAt: '2026-05-30T00:00:00.000Z',
        avatar: {
          body: 'cat',
          primaryColor: '#f6c65b',
          secondaryColor: '#fff1bf',
          eyeStyle: 'round',
          mouthStyle: 'smile',
          cheekStyle: 'pink',
          accessory: 'none',
        },
      },
    }, snapshot.revision)).rejects.toThrow('app data changed');

    const latest = await backend.loadAppDataSnapshot();
    expect(latest.revision).toBe(1);
    expect(latest.data.profile?.name).toBe('米糕');
    expect(updates).toHaveLength(1);

    unsubscribe();
  });

  it('returns the updated snapshot from preview compare-and-save', async () => {
    const snapshot = await backend.loadAppDataSnapshot();

    const saved = await backend.saveAppDataIfCurrent({
      ...snapshot.data,
      profile: {
        name: '米糕',
        species: '桌面小兔',
        personaId: 'studyBuddy',
        createdAt: '2026-05-30T12:00:00.000Z',
        avatar: {
          body: 'bunny',
          primaryColor: '#9fd7ff',
          secondaryColor: '#e4f5ff',
          eyeStyle: 'sparkle',
          mouthStyle: 'smile',
          cheekStyle: 'peach',
          accessory: 'headphones',
        },
      },
    }, snapshot.revision);

    expect(saved.revision).toBe(1);
    expect(saved.data.profile?.name).toBe('米糕');
  });
});
