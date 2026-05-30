import { describe, expect, it } from 'vitest';
import { createPetEvent, createInitialPetState } from './petState';
import {
  completeDailyTask,
  createDailyTasks,
  createJournalEntry,
  ensureDailyCare,
  applyTaskRewardToState,
  taskRewardFor,
} from './petLifecycle';

describe('petLifecycle', () => {
  it('creates five daily care tasks that map to real interactions', () => {
    const care = ensureDailyCare(undefined, '2026-05-30T09:00:00.000Z');

    expect(care.date).toBe('2026-05-30');
    expect(care.tasks.map((task) => task.kind)).toEqual(['feed', 'chat', 'focus', 'rest', 'reflect']);
    expect(care.tasks.every((task) => !task.completedAt)).toBe(true);
  });

  it('keeps same-day task progress and resets on the next day', () => {
    const care = ensureDailyCare(undefined, '2026-05-30T09:00:00.000Z');
    const completed = completeDailyTask(care, 'feed', '2026-05-30T09:10:00.000Z');

    expect(ensureDailyCare(completed, '2026-05-30T12:00:00.000Z').tasks[0].completedAt).toBe('2026-05-30T09:10:00.000Z');
    expect(ensureDailyCare(completed, '2026-05-31T09:00:00.000Z').tasks[0].completedAt).toBeUndefined();
  });

  it('builds a journal entry from the day events and relationship changes', () => {
    const state = {
      ...createInitialPetState('2026-05-30T09:00:00.000Z'),
      mood: 'happy' as const,
      intimacy: 28,
      trust: 22,
      lifeStage: 'teen' as const,
    };
    const events = [
      createPetEvent('feed', '2026-05-30T09:10:00.000Z', { note: '早餐' }),
      createPetEvent('chat', '2026-05-30T10:10:00.000Z', { userText: '今天要写方案' }),
      createPetEvent('focus', '2026-05-30T11:00:00.000Z', { note: '完成 25 分钟专注' }),
    ];

    const entry = createJournalEntry('2026-05-30T21:00:00.000Z', state, events, ['用户要写方案']);

    expect(entry.date).toBe('2026-05-30');
    expect(entry.meals).toContain('早餐');
    expect(entry.conversations).toContain('今天要写方案');
    expect(entry.moodTrail).toContain('happy');
    expect(entry.remembered).toContain('用户要写方案');
    expect(entry.relationship).toContain('亲密 28');
  });

  it('creates task definitions with concrete rewards', () => {
    const tasks = createDailyTasks('2026-05-30');

    expect(tasks).toHaveLength(5);
    expect(tasks[0]).toMatchObject({ kind: 'feed', rewardCoins: 6, rewardExperience: 10 });
    expect(tasks[2]).toMatchObject({ kind: 'focus', rewardCoins: 16, rewardExperience: 24 });
  });

  it('applies daily task rewards only for unfinished tasks', () => {
    const care = ensureDailyCare(undefined, '2026-05-30T09:00:00.000Z');
    const state = createInitialPetState('2026-05-30T09:00:00.000Z');
    const rewarded = applyTaskRewardToState(state, taskRewardFor(care, 'feed'));
    const completed = completeDailyTask(care, 'feed', '2026-05-30T09:05:00.000Z');

    expect(rewarded.coins).toBe(6);
    expect(rewarded.experience).toBe(10);
    expect(applyTaskRewardToState(rewarded, taskRewardFor(completed, 'feed')).coins).toBe(6);
  });
});
