import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatWindow } from './ChatWindow';
import { backend } from '../../tauri/commands';

vi.mock('../../tauri/commands', () => ({
  backend: {
    loadAppData: vi.fn().mockResolvedValue({
      profile: { name: '桃桃', species: '桌面小猫', personaId: 'healing', createdAt: '2026-05-30T00:00:00.000Z' },
      state: { mood: 'calm', hunger: 20, energy: 80, intimacy: 10, action: 'idle', lastInteractionAt: '2026-05-30T00:00:00.000Z' },
      settings: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', temperature: 0.7 },
      memory: { facts: [], recentSummary: '', updatedAt: '2026-05-30T00:00:00.000Z' },
    }),
    sendPetChat: vi.fn().mockResolvedValue({ text: '我在这里陪你。' }),
    saveAppData: vi.fn().mockImplementation((data) => Promise.resolve(data)),
  },
}));

describe('ChatWindow', () => {
  it('sends user message and shows pet reply', async () => {
    const user = userEvent.setup();
    render(<ChatWindow />);

    await user.type(await screen.findByLabelText('聊天输入'), '今天好累');
    await user.click(screen.getByRole('button', { name: '发送消息' }));

    expect(await screen.findByText('今天好累')).toBeInTheDocument();
    expect(await screen.findByText('我在这里陪你。')).toBeInTheDocument();
    expect(backend.saveAppData).toHaveBeenCalledWith(expect.objectContaining({
      memory: expect.objectContaining({
        facts: expect.arrayContaining([expect.stringContaining('今天好累')]),
      }),
    }));
  });
});
