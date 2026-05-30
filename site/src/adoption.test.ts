import { describe, expect, it, vi } from 'vitest';
import { defaultPetAvatar } from '@desktop-pet/domain/petAvatar';
import { parsePetAdoptionText } from '@desktop-pet/domain/petAdoption';
import { createAdoptionDocument, downloadAdoptionDocument } from './adoption';

describe('site adoption helpers', () => {
  it('creates a schema-compatible adoption document', () => {
    const document = createAdoptionDocument({
      name: '米糕',
      species: '桌面小兔',
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
        personaId: 'studyBuddy',
      }),
    }));
    expect(parsePetAdoptionText(JSON.stringify(document)).profile.avatar.body).toBe('bunny');
  });

  it('downloads the adoption document as adoption.pet', () => {
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');
    const click = vi.fn();
    const createElement = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLAnchorElement;
      if (tagName === 'a') element.click = click;
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

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(appendChild).toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
    expect(removeChild).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:pet');

    createElement.mockRestore();
  });
});
