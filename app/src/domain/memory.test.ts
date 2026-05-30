import { describe, expect, it } from 'vitest';
import { updateMemorySummary } from './memory';

describe('memory', () => {
  it('keeps user preference facts and trims oldest facts after six entries', () => {
    const memory = updateMemorySummary(
      {
        facts: ['喜欢夜间工作', '讨厌太长的建议', '喜欢番茄钟', '正在学 Rust', '喜欢短回复', '偏好中文'],
        recentSummary: '用户最近在设计桌宠。',
        updatedAt: '2026-05-30T00:00:00.000Z',
      },
      '用户说自己喜欢治愈型陪伴。',
      '2026-05-30T01:00:00.000Z',
    );

    expect(memory.facts).toEqual([
      '讨厌太长的建议',
      '喜欢番茄钟',
      '正在学 Rust',
      '喜欢短回复',
      '偏好中文',
      '用户说自己喜欢治愈型陪伴。',
    ]);
    expect(memory.recentSummary).toContain('用户最近在设计桌宠。');
    expect(memory.updatedAt).toBe('2026-05-30T01:00:00.000Z');
  });
});
