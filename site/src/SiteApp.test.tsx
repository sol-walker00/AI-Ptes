import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdoptionDocument, downloadAdoptionDocument } from './adoption';
import { SiteApp } from './SiteApp';

vi.mock('./adoption', () => ({
  createAdoptionDocument: vi.fn((profile: { name: string; species: string; personaId: string; avatar: unknown }) => ({
    format: 'desktop-pet-adoption',
    version: 1,
    adoptionId: 'test-adoption',
    createdAt: '2026-05-30T00:00:00.000Z',
    profile: {
      name: profile.name.trim(),
      species: profile.species.trim(),
      personaId: profile.personaId,
      createdAt: '2026-05-30T00:00:00.000Z',
      avatar: profile.avatar,
    },
  })),
  downloadAdoptionDocument: vi.fn(),
}));

describe('SiteApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createAdoptionDocument).mockImplementation(
      (profile: { name: string; species: string; personaId: string; avatar: unknown }) => ({
        format: 'desktop-pet-adoption',
        version: 1,
        adoptionId: 'test-adoption',
        createdAt: '2026-05-30T00:00:00.000Z',
        profile: {
          name: profile.name.trim(),
          species: profile.species.trim(),
          personaId: profile.personaId,
          createdAt: '2026-05-30T00:00:00.000Z',
          avatar: profile.avatar,
        },
      }),
    );
    vi.mocked(downloadAdoptionDocument).mockImplementation(() => undefined);
  });

  it('opens directly on the pet creation experience', () => {
    render(<SiteApp />);

    expect(screen.getByRole('heading', { name: '创建你的桌面宠物' })).toBeInTheDocument();
    expect(screen.getByLabelText('宠物名字')).toHaveValue('桃桃');
    expect(screen.getByLabelText('custom pet avatar')).toBeInTheDocument();
  });

  it('updates the live avatar preview from dress-up controls', async () => {
    const user = userEvent.setup();
    render(<SiteApp />);

    await user.click(screen.getByRole('button', { name: '体型 兔兔' }));
    await user.click(screen.getByRole('button', { name: '主色 天空蓝' }));
    await user.click(screen.getByRole('button', { name: '配饰 耳机' }));

    const avatar = screen.getByLabelText('custom pet avatar');
    expect(avatar).toHaveAttribute('data-avatar-body', 'bunny');
    expect(avatar).toHaveAttribute('data-avatar-accessory', 'headphones');
    expect(avatar.querySelector('[data-layer="body"]')).toHaveAttribute('fill', '#9fd7ff');
  });

  it('disables adoption download when the pet name is empty', async () => {
    const user = userEvent.setup();
    render(<SiteApp />);

    await user.clear(screen.getByLabelText('宠物名字'));

    expect(screen.getByRole('button', { name: '下载领养档案' })).toBeDisabled();
  });

  it('disables adoption download when the pet species is empty', async () => {
    const user = userEvent.setup();
    render(<SiteApp />);

    await user.clear(screen.getByLabelText('宠物形象'));

    expect(screen.getByRole('button', { name: '下载领养档案' })).toBeDisabled();
  });

  it('downloads an adoption document with the current form values and shows success status', async () => {
    const user = userEvent.setup();
    render(<SiteApp />);

    await user.clear(screen.getByLabelText('宠物名字'));
    await user.type(screen.getByLabelText('宠物名字'), '  花花  ');
    await user.clear(screen.getByLabelText('宠物形象'));
    await user.type(screen.getByLabelText('宠物形象'), '云朵兔');
    await user.click(screen.getByRole('button', { name: '下载领养档案' }));

    expect(createAdoptionDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '  花花  ',
        species: '云朵兔',
        personaId: 'healing',
      }),
    );
    expect(downloadAdoptionDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({
          name: '花花',
          species: '云朵兔',
        }),
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('花花 的领养档案已下载。');
  });

  it('shows a failure status when the adoption download helper throws', async () => {
    const user = userEvent.setup();
    vi.mocked(downloadAdoptionDocument).mockImplementation(() => {
      throw new Error('download failed');
    });
    render(<SiteApp />);

    await user.click(screen.getByRole('button', { name: '下载领养档案' }));

    expect(screen.getByRole('status')).toHaveTextContent('下载失败，请重试。');
  });

  it('shows macOS and Windows desktop download links', () => {
    render(<SiteApp />);

    expect(screen.getByRole('link', { name: '下载 macOS 版' })).toHaveAttribute(
      'href',
      '/downloads/Desktop-AI-Pet-0.1.0-macos-aarch64.zip',
    );
    expect(screen.getByRole('link', { name: '下载 Windows 版' })).toHaveAttribute(
      'href',
      '/downloads/Desktop-AI-Pet-0.1.0-windows-x64.zip',
    );
    expect(screen.queryByText('客户端安装包即将开放')).not.toBeInTheDocument();
  });
});
