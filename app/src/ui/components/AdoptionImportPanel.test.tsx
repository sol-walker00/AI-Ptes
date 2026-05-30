import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { defaultPetAvatar } from '../../domain/petAvatar';
import { AdoptionImportPanel } from './AdoptionImportPanel';

const validPetFile = new File([
  JSON.stringify({
    format: 'desktop-ai-pet-adoption',
    version: 1,
    adoptionId: 'pet_abc123',
    createdAt: '2026-05-30T12:00:00.000Z',
    profile: {
      name: '桃桃',
      species: '桌面小猫',
      personaId: 'healing',
      avatar: { ...defaultPetAvatar(), body: 'bunny' },
    },
  }),
], 'adoption.pet', { type: 'application/json' });

describe('AdoptionImportPanel', () => {
  it('imports a valid .pet file and returns complete app data', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn().mockResolvedValue(undefined);
    render(<AdoptionImportPanel onImport={onImport} onCreateLocally={vi.fn()} />);

    await user.upload(screen.getByLabelText('选择领养档案'), validPetFile);

    expect(await screen.findByText('桃桃 已准备回家。')).toBeInTheDocument();
    expect(onImport).toHaveBeenCalledWith(expect.objectContaining({
      profile: expect.objectContaining({
        name: '桃桃',
        avatar: expect.objectContaining({ body: 'bunny' }),
      }),
      state: expect.objectContaining({
        lastInteractionAt: '2026-05-30T12:00:00.000Z',
      }),
      events: [],
    }));
  });

  it('shows a clear error for invalid files and does not import', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    render(<AdoptionImportPanel onImport={onImport} onCreateLocally={vi.fn()} />);

    await user.upload(screen.getByLabelText('选择领养档案'), new File(['{not json'], 'broken.pet'));

    expect(await screen.findByText('这个领养档案无法读取')).toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
  });

  it('resets the file input after an invalid file so a valid file can be selected', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn().mockResolvedValue(undefined);
    render(<AdoptionImportPanel onImport={onImport} onCreateLocally={vi.fn()} />);

    const fileInput = screen.getByLabelText('选择领养档案');
    await user.upload(fileInput, new File(['{not json'], 'broken.pet'));

    expect(await screen.findByText('这个领养档案无法读取')).toBeInTheDocument();
    expect(fileInput).toHaveValue('');

    await user.upload(fileInput, validPetFile);

    expect(await screen.findByText('桃桃 已准备回家。')).toBeInTheDocument();
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it('communicates busy state while importing', async () => {
    const user = userEvent.setup();
    let finishImport: () => void = () => {};
    const onImport = vi.fn(() => new Promise<void>((resolve) => {
      finishImport = resolve;
    }));
    render(<AdoptionImportPanel onImport={onImport} onCreateLocally={vi.fn()} />);

    await user.upload(screen.getByLabelText('选择领养档案'), validPetFile);

    expect(screen.getByText('导入中...').closest('label')).toHaveAttribute('aria-disabled', 'true');

    finishImport();
    expect(await screen.findByText('桃桃 已准备回家。')).toBeInTheDocument();
  });

  it('disables local creation while an import is in progress', async () => {
    const user = userEvent.setup();
    let finishImport: () => void = () => {};
    const onImport = vi.fn(() => new Promise<void>((resolve) => {
      finishImport = resolve;
    }));
    const onCreateLocally = vi.fn();
    render(<AdoptionImportPanel onImport={onImport} onCreateLocally={onCreateLocally} />);

    await user.upload(screen.getByLabelText('选择领养档案'), validPetFile);

    const localCreateButton = screen.getByRole('button', { name: '本地创建新宠物' });
    expect(localCreateButton).toBeDisabled();

    await user.click(localCreateButton);
    expect(onCreateLocally).not.toHaveBeenCalled();

    finishImport();
    expect(await screen.findByText('桃桃 已准备回家。')).toBeInTheDocument();
  });

  it('lets the user continue with local creation', async () => {
    const user = userEvent.setup();
    const onCreateLocally = vi.fn();
    render(<AdoptionImportPanel onImport={vi.fn()} onCreateLocally={onCreateLocally} />);

    await user.click(screen.getByRole('button', { name: '本地创建新宠物' }));

    expect(onCreateLocally).toHaveBeenCalledTimes(1);
  });
});
