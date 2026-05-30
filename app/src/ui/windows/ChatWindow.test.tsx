import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultPetAvatar } from '../../domain/petAvatar';
import { ChatWindow } from './ChatWindow';
import { backend } from '../../tauri/commands';
import type { AppData, AppDataSnapshot } from '../../tauri/commandTypes';

let appDataSnapshotUpdateCallback: ((snapshot: AppDataSnapshot) => void) | null = null;

function appData(overrides: Partial<AppData> = {}): AppData {
  return {
    profile: {
      name: '桃桃',
      species: '桌面小猫',
      personaId: 'healing',
      createdAt: '2026-05-30T00:00:00.000Z',
      avatar: defaultPetAvatar(),
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
    dailyCare: null,
    journal: [],
    ...overrides,
  };
}

function adoptedAppData(name = '米糕'): AppData {
  return appData({
    profile: {
      name,
      species: '桌面小兔',
      personaId: 'studyBuddy',
      createdAt: '2026-05-30T12:00:00.000Z',
      avatar: {
        ...defaultPetAvatar(),
        body: 'bunny',
        primaryColor: '#9fd7ff',
        accessory: 'headphones',
      },
    },
    state: { mood: 'calm', hunger: 20, energy: 80, intimacy: 10, action: 'idle', lastInteractionAt: '2026-05-30T12:00:00.000Z' },
    memory: { facts: [], recentSummary: '', updatedAt: '2026-05-30T12:00:00.000Z' },
  });
}

function snapshot(data = appData(), revision = 0): AppDataSnapshot {
  return { data, revision };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

vi.mock('../../tauri/commands', () => ({
  backend: {
    loadAppDataSnapshot: vi.fn().mockResolvedValue(snapshot()),
    subscribeAppDataSnapshotUpdates: vi.fn((callback) => {
      appDataSnapshotUpdateCallback = callback;
      return Promise.resolve(() => {
        if (appDataSnapshotUpdateCallback === callback) appDataSnapshotUpdateCallback = null;
      });
    }),
    sendPetChat: vi.fn().mockResolvedValue({ text: '我在这里陪你。' }),
    saveAppDataIfCurrent: vi.fn().mockImplementation((data, expectedRevision) => Promise.resolve(snapshot(data, expectedRevision + 1))),
  },
}));

describe('ChatWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-05-30T00:05:00.000Z'));
    appDataSnapshotUpdateCallback = null;
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
    expect(backend.saveAppDataIfCurrent).toHaveBeenCalledWith(expect.objectContaining({
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
    }), 0);
  });

  it('does not save stale chat data after app data changes during the request', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const chat = deferred<{ text: string }>();
    vi.mocked(backend.sendPetChat).mockReturnValueOnce(chat.promise);
    render(<ChatWindow />);

    await user.type(await screen.findByLabelText('聊天输入'), '今天好累');
    await user.click(screen.getByRole('button', { name: '发送消息' }));

    act(() => {
      appDataSnapshotUpdateCallback?.(snapshot(adoptedAppData(), 1));
    });
    expect(await screen.findByRole('heading', { name: '和米糕聊天' })).toBeInTheDocument();

    await act(async () => {
      chat.resolve({ text: '我在这里陪你。' });
      await chat.promise;
    });

    expect(backend.saveAppDataIfCurrent).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: '和米糕聊天' })).toBeInTheDocument();
  });

  it('reloads latest data when compare-save loses the backend revision race', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.mocked(backend.loadAppDataSnapshot)
      .mockResolvedValueOnce(snapshot(appData(), 0))
      .mockResolvedValueOnce(snapshot(adoptedAppData(), 1));
    vi.mocked(backend.saveAppDataIfCurrent).mockRejectedValueOnce(new Error('app data changed'));
    render(<ChatWindow />);

    await user.type(await screen.findByLabelText('聊天输入'), '今天好累');
    await user.click(screen.getByRole('button', { name: '发送消息' }));

    expect(await screen.findByRole('heading', { name: '和米糕聊天' })).toBeInTheDocument();
    expect(screen.queryByText('我有点晕乎，这次没想明白。')).not.toBeInTheDocument();
  });

  it('shows an empty state when there is no local profile', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.mocked(backend.loadAppDataSnapshot).mockResolvedValueOnce(snapshot(appData({ profile: null, state: null })));
    render(<ChatWindow />);

    expect(await screen.findByText('还没有宠物住进来。')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '和桃桃聊天' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发送消息' })).toBeDisabled();

    await user.type(screen.getByLabelText('聊天输入'), '今天好累');
    await user.click(screen.getByRole('button', { name: '发送消息' }));

    expect(backend.sendPetChat).not.toHaveBeenCalled();
    expect(backend.saveAppDataIfCurrent).not.toHaveBeenCalled();
  });

  it('uses the returned revision for consecutive chat saves', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.mocked(backend.saveAppDataIfCurrent).mockImplementation((data, expectedRevision) => Promise.resolve(snapshot(data, expectedRevision + 1)));
    render(<ChatWindow />);

    await user.type(await screen.findByLabelText('聊天输入'), '第一句');
    await user.click(screen.getByRole('button', { name: '发送消息' }));
    await waitFor(() => expect(backend.saveAppDataIfCurrent).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText('聊天输入'), '第二句');
    await user.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => expect(backend.saveAppDataIfCurrent).toHaveBeenCalledTimes(2));
    expect(backend.saveAppDataIfCurrent).toHaveBeenNthCalledWith(1, expect.any(Object), 0);
    expect(backend.saveAppDataIfCurrent).toHaveBeenNthCalledWith(2, expect.any(Object), 1);
  });
});
