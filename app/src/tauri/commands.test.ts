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
    expect(localStorage.getItem('ai-pet-dev-app-data')).toBeNull();
  });
});
