import { describe, expect, it } from 'vitest';
import { buildPetMessages, mapAssistantTextToReply } from './petBrain';
import { createInitialPetState } from './petState';

describe('petBrain', () => {
  it('wraps user input with pet persona, state, and memory', () => {
    const state = createInitialPetState('2026-05-30T00:00:00.000Z');
    const messages = buildPetMessages({
      profile: {
        name: '桃桃',
        species: '桌面小猫',
        personaId: 'healing',
        createdAt: '2026-05-30T00:00:00.000Z',
      },
      state,
      memory: {
        facts: ['用户喜欢短回复'],
        recentSummary: '用户今天在设计 AI 宠物。',
        updatedAt: '2026-05-30T00:00:00.000Z',
      },
      userText: '今天好累',
    });

    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('桃桃');
    expect(messages[0].content).toContain('治愈');
    expect(messages[0].content).toContain('心情 calm');
    expect(messages[0].content).toContain('用户喜欢短回复');
    expect(messages[1]).toEqual({ role: 'user', content: '今天好累' });
  });

  it('maps assistant text to an affectionate reply when sentiment is warm', () => {
    const state = createInitialPetState('2026-05-30T00:00:00.000Z');
    const reply = mapAssistantTextToReply('抱抱你，我会陪着你的。', state);

    expect(reply.action).toBe('affectionate');
    expect(reply.text).toBe('抱抱你，我会陪着你的。');
    expect(reply.nextState.intimacy).toBe(10);
  });

  it('does not count an assistant reply as another chat interaction', () => {
    const state = {
      ...createInitialPetState('2026-05-30T00:05:00.000Z'),
      energy: 74,
      intimacy: 12,
      action: 'thinking' as const,
    };
    const reply = mapAssistantTextToReply('我想试试这个办法。', state);

    expect(reply.nextState.energy).toBe(74);
    expect(reply.nextState.intimacy).toBe(12);
    expect(reply.nextState.lastInteractionAt).toBe('2026-05-30T00:05:00.000Z');
  });
});
