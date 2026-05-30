import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultPetAvatar } from '@desktop-pet/domain/petAvatar';
import { parsePetAdoptionText } from '@desktop-pet/domain/petAdoption';
import { createAdoptionDocument, downloadAdoptionDocument } from './adoption';

describe('site adoption helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a schema-compatible adoption document', () => {
    const document = createAdoptionDocument({
      name: ' 米糕 ',
      species: ' 桌面小兔 ',
      personaId: 'studyBuddy',
      avatar: {
        ...defaultPetAvatar(),
        body: 'bunny',
        primaryColor: '#9fd7ff',
      },
    }, {
      id: 'pet_fixed',
      createdAt: '2026-05-30T12:00:00.000Z',
    });

    expect(document).toEqual(expect.objectContaining({
      format: 'desktop-ai-pet-adoption',
      version: 1,
      adoptionId: 'pet_fixed',
      createdAt: '2026-05-30T12:00:00.000Z',
      profile: expect.objectContaining({
        name: '米糕',
        species: '桌面小兔',
        personaId: 'studyBuddy',
      }),
    }));
    expect(parsePetAdoptionText(JSON.stringify(document)).profile.avatar.body).toBe('bunny');
  });

  it('rejects a whitespace-only pet name', () => {
    expect(() => createAdoptionDocument({
      name: '   ',
      species: '桌面小猫',
      personaId: 'healing',
      avatar: defaultPetAvatar(),
    })).toThrow('宠物名字不能为空');
  });

  it('rejects a whitespace-only pet species', () => {
    expect(() => createAdoptionDocument({
      name: '桃桃',
      species: '   ',
      personaId: 'healing',
      avatar: defaultPetAvatar(),
    })).toThrow('宠物形象不能为空');
  });

  it('downloads the adoption document as adoption.pet', async () => {
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');
    const click = vi.fn();
    let link: HTMLAnchorElement | undefined;
    const createElement = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLAnchorElement;
      if (tagName === 'a') {
        element.click = click;
        link = element;
      }
      return element;
    });
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pet');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    downloadAdoptionDocument(createAdoptionDocument({
      name: '桃桃',
      species: '桌面小猫',
      personaId: 'healing',
      avatar: defaultPetAvatar(),
    }, {
      id: 'pet_fixed',
      createdAt: '2026-05-30T12:00:00.000Z',
    }));

    const blob = createObjectUrl.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    await expect(blob?.text()).resolves.toBe(`${JSON.stringify(createAdoptionDocument({
      name: '桃桃',
      species: '桌面小猫',
      personaId: 'healing',
      avatar: defaultPetAvatar(),
    }, {
      id: 'pet_fixed',
      createdAt: '2026-05-30T12:00:00.000Z',
    }), null, 2)}\n`);
    expect(link?.download).toBe('adoption.pet');
    expect(link?.href).toBe('blob:pet');
    expect(appendChild).toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
    expect(removeChild).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:pet');
  });

  it('cleans up the adoption download link when click throws', () => {
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');
    const clickError = new Error('blocked download');
    const createElement = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLAnchorElement;
      if (tagName === 'a') element.click = vi.fn(() => {
        throw clickError;
      });
      return element;
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pet');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    expect(() => downloadAdoptionDocument(createAdoptionDocument({
      name: '桃桃',
      species: '桌面小猫',
      personaId: 'healing',
      avatar: defaultPetAvatar(),
    }, {
      id: 'pet_fixed',
      createdAt: '2026-05-30T12:00:00.000Z',
    }))).toThrow(clickError);

    expect(createElement).toHaveBeenCalledWith('a');
    expect(appendChild).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:pet');
  });
});
