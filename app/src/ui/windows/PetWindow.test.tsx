import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultPetAvatar } from '../../domain/petAvatar';
import { PetWindow } from './PetWindow';
import { backend } from '../../tauri/commands';

const startDragging = vi.fn().mockResolvedValue(undefined);

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    startDragging,
  }),
}));

vi.mock('../../tauri/commands', () => ({
  backend: {
    loadAppData: vi.fn().mockResolvedValue({
      profile: { name: '桃桃', species: '桌面小猫', personaId: 'healing', createdAt: '2026-05-30T00:00:00.000Z' },
      state: { mood: 'calm', hunger: 20, energy: 80, intimacy: 10, action: 'idle', lastInteractionAt: '2026-05-30T00:00:00.000Z' },
      settings: {
        providerId: 'deepseek',
        protocol: 'openai-chat',
        auth: 'bearer',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-v4-flash',
        temperature: 0.7,
        customHeaders: {},
      },
      memory: { facts: [], recentSummary: '', updatedAt: '2026-05-30T00:00:00.000Z' },
      events: [],
    }),
    sendPetChat: vi.fn().mockResolvedValue({ text: '我会陪着你。' }),
    saveAppData: vi.fn().mockImplementation((data) => Promise.resolve(data)),
  },
}));

describe('PetWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-05-30T00:05:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('counts quick chat as one interaction when saving pet state', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PetWindow />);

    await user.click(await screen.findByRole('button', { name: '快速对话' }));
    await user.type(screen.getByLabelText('和桃桃说话'), '陪我写代码');
    await user.click(screen.getByRole('button', { name: '发送' }));

    expect(await screen.findByText('我会陪着你。')).toBeInTheDocument();
    expect(backend.saveAppData).toHaveBeenCalledWith(expect.objectContaining({
      state: expect.objectContaining({
        energy: 74,
        intimacy: 14,
        lastInteractionAt: expect.stringMatching(/^2026-05-30T00:05:00\.\d{3}Z$/),
      }),
      events: expect.arrayContaining([
        expect.objectContaining({ kind: 'chat', note: '陪我写代码' }),
      ]),
    }));
  });

  it('renders the saved custom avatar in the desktop pet body', async () => {
    vi.mocked(backend.loadAppData).mockResolvedValueOnce({
      profile: {
        name: '桃桃',
        species: '桌面小兔',
        personaId: 'healing',
        createdAt: '2026-05-30T00:00:00.000Z',
        avatar: {
          ...defaultPetAvatar(),
          body: 'bunny',
          primaryColor: '#9fd7ff',
          accessory: 'headphones',
        },
      },
      state: { mood: 'calm', hunger: 20, energy: 80, intimacy: 10, action: 'idle', lastInteractionAt: '2026-05-30T00:00:00.000Z' },
      settings: {
        providerId: 'deepseek',
        protocol: 'openai-chat',
        auth: 'bearer',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-v4-flash',
        temperature: 0.7,
        customHeaders: {},
      },
      memory: { facts: [], recentSummary: '', updatedAt: '2026-05-30T00:00:00.000Z' },
      events: [],
    });
    render(<PetWindow />);

    const avatar = await screen.findByLabelText('custom pet avatar');

    expect(avatar).toHaveAttribute('data-avatar-body', 'bunny');
    expect(avatar).toHaveAttribute('data-avatar-accessory', 'headphones');
    expect(avatar.querySelector('[data-layer="body"]')).toHaveAttribute('fill', '#9fd7ff');
  });

  it('starts dragging from the pet body and passive panels', async () => {
    const { container } = render(<PetWindow />);

    fireEvent.mouseDown(await screen.findByRole('button', { name: '拖动或点击桃桃' }));
    fireEvent.mouseDown(container.querySelector('.speech-bubble')!);
    fireEvent.mouseDown(screen.getByLabelText('pet status'));

    expect(startDragging).toHaveBeenCalledTimes(3);
  });

  it('does not start dragging from controls that need normal clicks or typing', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PetWindow />);

    await user.click(await screen.findByRole('button', { name: '快速对话' }));
    fireEvent.mouseDown(screen.getByLabelText('和桃桃说话'));
    fireEvent.mouseDown(screen.getByRole('button', { name: '发送' }));
    fireEvent.mouseDown(screen.getByRole('button', { name: '喂食' }));

    expect(startDragging).not.toHaveBeenCalled();
  });
});
