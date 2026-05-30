import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsWindow } from './SettingsWindow';
import { backend } from '../../tauri/commands';

vi.mock('../../tauri/commands', () => ({
  backend: {
    loadAppData: vi.fn().mockResolvedValue({
      profile: { name: '小梨', species: '桌面小猫', personaId: 'healing', createdAt: '2026-05-30T00:00:00.000Z' },
      state: { mood: 'calm', hunger: 30, energy: 70, intimacy: 42, action: 'idle', lastInteractionAt: '2026-05-30T00:00:00.000Z' },
      settings: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash', temperature: 0.7 },
      memory: { facts: ['用户喜欢安静写代码'], recentSummary: '写代码时需要陪伴', updatedAt: '2026-05-30T00:00:00.000Z' },
      events: [{ id: 'chat-1', kind: 'chat', createdAt: '2026-05-30T00:00:00.000Z', intensity: 0.5, quality: 0.9, note: '写代码' }],
    }),
    saveAppData: vi.fn().mockImplementation((data) => Promise.resolve(data)),
    saveApiKey: vi.fn().mockResolvedValue('已保存 ****abcd'),
    getApiKeyStatus: vi.fn().mockResolvedValue(null),
  },
}));

describe('SettingsWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves pet profile and masks api key after save', async () => {
    const user = userEvent.setup();
    render(<SettingsWindow />);

    await user.clear(await screen.findByLabelText('宠物名字'));
    await user.type(screen.getByLabelText('宠物名字'), '桃桃');
    await user.type(screen.getByLabelText('API key'), 'sk-testabcd');
    await user.click(screen.getByRole('button', { name: '保存设置' }));

    expect(await screen.findByText('已保存 ****abcd')).toBeInTheDocument();
    expect(backend.saveAppData).toHaveBeenCalledWith(expect.objectContaining({
      profile: expect.objectContaining({ name: '桃桃', createdAt: '2026-05-30T00:00:00.000Z' }),
      state: expect.objectContaining({ intimacy: 42 }),
      memory: expect.objectContaining({ facts: ['用户喜欢安静写代码'] }),
      events: [expect.objectContaining({ id: 'chat-1', kind: 'chat' })],
    }));
  });

  it('prevents duplicate saves while a save is already running', async () => {
    const user = userEvent.setup();
    vi.mocked(backend.saveAppData).mockImplementationOnce(
      (data) => new Promise((resolve) => setTimeout(() => resolve(data), 50)),
    );
    render(<SettingsWindow />);

    const button = await screen.findByRole('button', { name: '保存设置' });
    await user.click(button);
    await user.click(button);

    expect(button).toBeDisabled();
    expect(backend.saveAppData).toHaveBeenCalledTimes(1);
  });

  it('shows an error when settings cannot be saved', async () => {
    const user = userEvent.setup();
    vi.mocked(backend.saveAppData).mockRejectedValueOnce(new Error('disk full'));
    render(<SettingsWindow />);

    await user.click(await screen.findByRole('button', { name: '保存设置' }));

    expect(await screen.findByText('保存失败：disk full')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存设置' })).toBeEnabled();
  });
});
