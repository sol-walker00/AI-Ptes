import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsWindow } from './SettingsWindow';
import { backend } from '../../tauri/commands';

vi.mock('../../tauri/commands', () => ({
  backend: {
    loadAppData: vi.fn().mockResolvedValue({
      profile: { name: '小梨', species: '桌面小猫', personaId: 'healing', createdAt: '2026-05-30T00:00:00.000Z' },
      state: { mood: 'calm', hunger: 30, energy: 70, intimacy: 42, action: 'idle', lastInteractionAt: '2026-05-30T00:00:00.000Z' },
      settings: {
        providerId: 'deepseek',
        protocol: 'openai-chat',
        auth: 'bearer',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-v4-flash',
        temperature: 0.7,
        customHeaders: {},
      },
      memory: { facts: ['用户喜欢安静写代码'], recentSummary: '写代码时需要陪伴', updatedAt: '2026-05-30T00:00:00.000Z' },
      events: [{ id: 'chat-1', kind: 'chat', createdAt: '2026-05-30T00:00:00.000Z', intensity: 0.5, quality: 0.9, note: '写代码' }],
    }),
    saveAppData: vi.fn().mockImplementation((data) => Promise.resolve(data)),
    saveApiKey: vi.fn().mockResolvedValue('已保存 ****abcd'),
    getApiKeyStatus: vi.fn().mockResolvedValue(null),
    testProviderConnection: vi.fn().mockResolvedValue('连接成功'),
  },
}));

describe('SettingsWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-05-30T00:05:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves pet profile and masks api key after save', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SettingsWindow />);

    await user.clear(await screen.findByLabelText('宠物名字'));
    await user.type(screen.getByLabelText('宠物名字'), '桃桃');
    await user.type(screen.getByLabelText('API key'), 'sk-testabcd');
    await user.click(screen.getByRole('button', { name: '保存设置' }));

    expect(await screen.findByText(/已保存 \*\*\*\*abcd/)).toBeInTheDocument();
    expect(backend.saveApiKey).toHaveBeenCalledWith('deepseek', 'sk-testabcd');
    expect(backend.saveAppData).toHaveBeenCalledWith(expect.objectContaining({
      profile: expect.objectContaining({ name: '桃桃', createdAt: '2026-05-30T00:00:00.000Z' }),
      state: expect.objectContaining({ intimacy: 42 }),
      memory: expect.objectContaining({ facts: ['用户喜欢安静写代码'] }),
      events: [expect.objectContaining({ id: 'chat-1', kind: 'chat' })],
    }));
  });

  it('switches provider presets and exposes advanced base url settings', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SettingsWindow />);

    await user.selectOptions(await screen.findByLabelText('供应商'), 'anthropic');
    expect(screen.getByLabelText('模型')).toHaveValue('claude-sonnet-4-20250514');

    await user.click(screen.getByRole('button', { name: '高级设置' }));
    expect(screen.getByLabelText('Base URL')).toHaveValue('https://api.anthropic.com/v1');
    expect(screen.getByLabelText('协议')).toHaveValue('anthropic-messages');
  });

  it('saves dress-up avatar selections with the pet profile', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SettingsWindow />);

    expect(await screen.findByRole('heading', { name: '形象装扮' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '兔兔' }));
    await user.click(screen.getByRole('button', { name: '主色 天空蓝' }));
    await user.click(screen.getByRole('button', { name: '星星眼' }));
    await user.click(screen.getByRole('button', { name: '耳机' }));
    await user.click(screen.getByRole('button', { name: '保存设置' }));

    expect(backend.saveAppData).toHaveBeenCalledWith(expect.objectContaining({
      profile: expect.objectContaining({
        avatar: expect.objectContaining({
          body: 'bunny',
          primaryColor: '#9fd7ff',
          eyeStyle: 'sparkle',
          accessory: 'headphones',
        }),
      }),
    }));
  });

  it('tests the selected provider connection before saving', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SettingsWindow />);

    await user.click(await screen.findByRole('button', { name: '测试连接' }));

    expect(await screen.findByText('连接成功')).toBeInTheDocument();
    expect(backend.testProviderConnection).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 'deepseek',
      model: 'deepseek-v4-flash',
    }));
  });

  it('prevents duplicate saves while a save is already running', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.mocked(backend.saveAppData).mockRejectedValueOnce(new Error('disk full'));
    render(<SettingsWindow />);

    await user.click(await screen.findByRole('button', { name: '保存设置' }));

    expect(await screen.findByText('保存失败：disk full')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存设置' })).toBeEnabled();
  });
});
