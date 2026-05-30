import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SiteApp } from './SiteApp';

describe('SiteApp', () => {
  it('opens directly on the pet creation experience', () => {
    render(<SiteApp />);

    expect(screen.getByRole('heading', { name: '创建你的桌面宠物' })).toBeInTheDocument();
    expect(screen.getByLabelText('宠物名字')).toHaveValue('桃桃');
    expect(screen.getByLabelText('custom pet avatar')).toBeInTheDocument();
  });

  it('updates the live avatar preview from dress-up controls', async () => {
    const user = userEvent.setup();
    render(<SiteApp />);

    await user.click(screen.getByRole('button', { name: '兔兔' }));
    await user.click(screen.getByRole('button', { name: '主色 天空蓝' }));
    await user.click(screen.getByRole('button', { name: '耳机' }));

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

  it('shows static download buttons as unavailable before installers are configured', () => {
    render(<SiteApp />);

    expect(screen.getByRole('button', { name: '下载 macOS 版' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '下载 Windows 版' })).toBeDisabled();
    expect(screen.getByText('客户端安装包即将开放')).toBeInTheDocument();
  });
});
