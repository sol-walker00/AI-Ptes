import { describe, expect, it } from 'vitest';
import {
  applyInteraction,
  createInitialPetState,
  deriveMood,
  restoreStateAfterTime,
} from './petState';

describe('petState', () => {
  it('creates a balanced initial state', () => {
    const state = createInitialPetState('2026-05-30T00:00:00.000Z');

    expect(state).toEqual({
      mood: 'calm',
      hunger: 20,
      energy: 80,
      intimacy: 10,
      action: 'idle',
      lastInteractionAt: '2026-05-30T00:00:00.000Z',
    });
  });

  it('reduces hunger and increases intimacy when fed', () => {
    const state = createInitialPetState('2026-05-30T00:00:00.000Z');
    const next = applyInteraction(state, 'feed', '2026-05-30T00:01:00.000Z');

    expect(next.hunger).toBe(0);
    expect(next.energy).toBe(82);
    expect(next.intimacy).toBe(13);
    expect(next.action).toBe('happy');
    expect(next.mood).toBe('happy');
  });

  it('uses chat energy and raises intimacy', () => {
    const state = createInitialPetState('2026-05-30T00:00:00.000Z');
    const next = applyInteraction(state, 'chat', '2026-05-30T00:03:00.000Z');

    expect(next.energy).toBe(74);
    expect(next.intimacy).toBe(12);
    expect(next.action).toBe('thinking');
  });

  it('increases hunger and reduces energy as time passes', () => {
    const state = createInitialPetState('2026-05-30T00:00:00.000Z');
    const next = restoreStateAfterTime(state, '2026-05-30T03:00:00.000Z');

    expect(next.hunger).toBe(38);
    expect(next.energy).toBe(71);
    expect(next.mood).toBe('calm');
  });

  it('derives hungry mood before sleepy mood', () => {
    expect(deriveMood({ hunger: 88, energy: 15, intimacy: 20 })).toBe('hungry');
  });
});
