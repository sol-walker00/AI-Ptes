import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatWindow } from './ChatWindow';
import { backend } from '../../tauri/commands';

vi.mock('../../tauri/commands', () => ({
  backend: {
    loadAppData: vi.fn().mockResolvedValue({
      profile: { name: '桃桃', species: '桌面小猫', personaId: 'healing', createdAt: '2026-05-30T00:00:00.000Z' },
      state: { mood: 'calm', hunger: 20, energy: 80, intimacy: 10, action: 'idle', lastInteractionAt: '2026-05-30T00:00:00.000Z' },
      settings: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash', temperature: 0.7 },
      memory: { facts: [], recentSummary: '', updatedAt: '2026-05-30T00:00:00.000Z' },
      events: [],
    }),
    sendPetChat: vi.fn().mockResolvedValue({ text: '我在这里陪你。' }),
    saveAppData: vi.fn().mockImplementation((data) => Promise.resolve(data)),
  },
}));

describe('ChatWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-05-30T00:05:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('sends user message and shows pet reply', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ChatWindow />);

    await user.type(await screen.findByLabelText('聊天输入'), '今天好累');
    await user.click(screen.getByRole('button', { name: '发送消息' }));

    expect(await screen.findByText('今天好累')).toBeInTheDocument();
    expect(await screen.findByText('我在这里陪你。')).toBeInTheDocument();
    expect(backend.saveAppData).toHaveBeenCalledWith(expect.objectContaining({
      state: expect.objectContaining({
        energy: 74,
        intimacy: 14,
        lastInteractionAt: expect.stringMatching(/^2026-05-30T00:05:00\.\d{3}Z$/),
      }),
      events: expect.arrayContaining([
        expect.objectContaining({ kind: 'chat', note: '今天好累' }),
      ]),
      memory: expect.objectContaining({
        facts: expect.arrayContaining([expect.stringContaining('今天好累')]),
      }),
    }));
  });
});
