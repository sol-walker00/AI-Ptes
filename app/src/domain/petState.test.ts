import { describe, expect, it } from 'vitest';
import {
  appendPetEvent,
  applyInteraction,
  applyPetEvent,
  createPetEvent,
  createInitialPetState,
  deriveMood,
  normalizePetState,
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
      cleanliness: 78,
      health: 88,
      boredom: 25,
      trust: 10,
      lifeStage: 'child',
      sleepState: 'awake',
      level: 1,
      experience: 0,
      coins: 0,
      action: 'idle',
      lastInteractionAt: '2026-05-30T00:00:00.000Z',
      lastCareAt: '2026-05-30T00:00:00.000Z',
    });
  });

  it('hydrates legacy state with lifecycle defaults', () => {
    const state = normalizePetState({
      mood: 'calm',
      hunger: 28,
      energy: 64,
      intimacy: 22,
      action: 'idle',
      lastInteractionAt: '2026-05-30T10:00:00.000Z',
    }, '2026-05-30T11:00:00.000Z');

    expect(state).toEqual(expect.objectContaining({
      hunger: 28,
      energy: 64,
      intimacy: 22,
      cleanliness: 78,
      health: 88,
      boredom: 25,
      trust: 10,
      lifeStage: 'child',
      sleepState: 'awake',
      level: 1,
      experience: 0,
      coins: 0,
      lastCareAt: '2026-05-30T10:00:00.000Z',
    }));
  });

  it('creates events with interaction quality instead of raw button deltas', () => {
    const event = createPetEvent('chat', '2026-05-30T12:00:00.000Z', {
      id: 'chat-1',
      userText: '今天真的好累，陪我一下',
      intensity: 0.5,
    });

    expect(event).toEqual({
      id: 'chat-1',
      kind: 'chat',
      createdAt: '2026-05-30T12:00:00.000Z',
      intensity: 0.5,
      quality: 0.9,
      note: '今天真的好累，陪我一下',
    });
  });

  it('feeds based on appetite and relationship context', () => {
    const state = {
      ...createInitialPetState('2026-05-30T12:00:00.000Z'),
      hunger: 82,
      energy: 40,
      intimacy: 20,
    };
    const event = createPetEvent('feed', '2026-05-30T12:10:00.000Z', { id: 'feed-1', quality: 0.8 });
    const next = applyPetEvent(state, event, []);

    expect(next.hunger).toBe(40);
    expect(next.energy).toBe(43);
    expect(next.intimacy).toBe(24);
    expect(next.action).toBe('happy');
    expect(next.mood).toBe('happy');
  });

  it('makes overfeeding weak and confusing instead of endlessly rewarding it', () => {
    const state = {
      ...createInitialPetState('2026-05-30T12:00:00.000Z'),
      hunger: 35,
      intimacy: 20,
    };
    const previousFeed = createPetEvent('feed', '2026-05-30T12:05:00.000Z', { id: 'feed-old' });
    const currentFeed = createPetEvent('feed', '2026-05-30T12:20:00.000Z', { id: 'feed-new' });
    const next = applyPetEvent(state, currentFeed, [previousFeed]);

    expect(next.hunger).toBe(30);
    expect(next.intimacy).toBe(19);
    expect(next.action).toBe('confused');
    expect(next.mood).toBe('confused');
  });

  it('uses chat energy and rewards high-quality emotional interaction', () => {
    const state = createInitialPetState('2026-05-30T12:00:00.000Z');
    const event = createPetEvent('chat', '2026-05-30T12:03:00.000Z', {
      id: 'chat-1',
      userText: '今天真的好累，陪我写一下代码',
      intensity: 0.5,
    });
    const next = applyPetEvent(state, event, []);

    expect(next.hunger).toBe(22);
    expect(next.energy).toBe(74);
    expect(next.intimacy).toBe(14);
    expect(next.action).toBe('thinking');
  });

  it('reduces repeated petting gains through cooldown', () => {
    const state = {
      ...createInitialPetState('2026-05-30T12:00:00.000Z'),
      intimacy: 20,
    };
    const events = [
      createPetEvent('pet', '2026-05-30T12:01:00.000Z', { id: 'pet-1', quality: 0.8 }),
      createPetEvent('pet', '2026-05-30T12:03:00.000Z', { id: 'pet-2', quality: 0.8 }),
      createPetEvent('pet', '2026-05-30T12:05:00.000Z', { id: 'pet-3', quality: 0.8 }),
    ];
    const next = applyPetEvent(
      state,
      createPetEvent('pet', '2026-05-30T12:06:00.000Z', { id: 'pet-4', quality: 0.8 }),
      events,
    );

    expect(next.intimacy).toBe(20);
    expect(next.action).toBe('confused');
  });

  it('lets real time drive hunger while idle time can recover energy', () => {
    const state = createInitialPetState('2026-05-30T10:00:00.000Z');
    const next = restoreStateAfterTime(state, '2026-05-30T13:00:00.000Z');

    expect(next.hunger).toBe(32);
    expect(next.energy).toBe(86);
    expect(next.intimacy).toBe(9);
    expect(next.mood).toBe('calm');
  });

  it('lets real time make the pet dirtier, less healthy, and more bored when ignored', () => {
    const state = createInitialPetState('2026-05-30T09:00:00.000Z');
    const next = restoreStateAfterTime(state, '2026-05-30T15:00:00.000Z');

    expect(next.cleanliness).toBe(60);
    expect(next.health).toBe(82);
    expect(next.boredom).toBe(49);
    expect(next.trust).toBe(7);
  });

  it('cleaning improves cleanliness and health while reducing boredom', () => {
    const state = {
      ...createInitialPetState('2026-05-30T12:00:00.000Z'),
      cleanliness: 35,
      health: 62,
      boredom: 70,
    };

    const next = applyPetEvent(state, createPetEvent('clean', '2026-05-30T12:10:00.000Z'), []);

    expect(next.cleanliness).toBe(75);
    expect(next.health).toBe(68);
    expect(next.boredom).toBe(58);
    expect(next.action).toBe('happy');
  });

  it('focused work rewards coins, experience, trust, and maturity', () => {
    const state = {
      ...createInitialPetState('2026-05-30T12:00:00.000Z'),
      experience: 95,
      trust: 30,
    };

    const next = applyPetEvent(
      state,
      createPetEvent('focus', '2026-05-30T12:30:00.000Z', { intensity: 0.8, quality: 0.9 }),
      [],
    );

    expect(next.experience).toBe(100);
    expect(next.level).toBe(2);
    expect(next.lifeStage).toBe('teen');
    expect(next.coins).toBe(18);
    expect(next.trust).toBe(37);
  });

  it('keeps only the latest event history for relationship simulation', () => {
    const events = Array.from({ length: 85 }, (_, index) =>
      createPetEvent('chat', `2026-05-30T12:${String(index).padStart(2, '0')}:00.000Z`, {
        id: `chat-${index}`,
      }),
    );
    const next = appendPetEvent(events, createPetEvent('rest', '2026-05-30T13:30:00.000Z', { id: 'rest-1' }));

    expect(next).toHaveLength(80);
    expect(next[0].id).toBe('chat-6');
    expect(next.at(-1)?.id).toBe('rest-1');
  });

  it('keeps the old applyInteraction wrapper compatible', () => {
    const state = createInitialPetState('2026-05-30T12:00:00.000Z');
    const next = applyInteraction(state, 'rest', '2026-05-30T12:05:00.000Z');

    expect(next.energy).toBe(100);
    expect(next.action).toBe('sleepy');
  });

  it('derives hungry mood before sleepy mood', () => {
    expect(deriveMood({ hunger: 88, energy: 15, intimacy: 20 })).toBe('hungry');
  });
});
