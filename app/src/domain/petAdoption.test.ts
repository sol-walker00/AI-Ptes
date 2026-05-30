import { describe, expect, it } from 'vitest';
import { defaultPetAvatar } from './petAvatar';
import {
  createAppDataFromPetAdoption,
  parsePetAdoptionText,
  petAdoptionFormat,
} from './petAdoption';

const validDocument = {
  format: 'desktop-ai-pet-adoption',
  version: 1,
  adoptionId: 'pet_abc123',
  createdAt: '2026-05-30T12:00:00.000Z',
  profile: {
    name: '  桃桃  ',
    species: '  桌面小猫  ',
    personaId: 'healing',
    avatar: {
      ...defaultPetAvatar(),
      body: 'bunny',
      primaryColor: '#9fd7ff',
      accessory: 'headphones',
    },
  },
};

describe('pet adoption documents', () => {
  it('parses a valid .pet document into a normalized profile', () => {
    const adoption = parsePetAdoptionText(JSON.stringify(validDocument));

    expect(adoption.format).toBe(petAdoptionFormat);
    expect(adoption.version).toBe(1);
    expect(adoption.adoptionId).toBe('pet_abc123');
    expect(adoption.profile).toEqual({
      name: '桃桃',
      species: '桌面小猫',
      personaId: 'healing',
      createdAt: '2026-05-30T12:00:00.000Z',
      avatar: expect.objectContaining({
        body: 'bunny',
        primaryColor: '#9fd7ff',
        accessory: 'headphones',
      }),
    });
  });

  it('creates complete local app data from a valid adoption document', () => {
    const adoption = parsePetAdoptionText(JSON.stringify(validDocument));
    const appData = createAppDataFromPetAdoption(adoption);

    expect(appData.profile.name).toBe('桃桃');
    expect(appData.state.mood).toBe('calm');
    expect(appData.state.lastInteractionAt).toBe('2026-05-30T12:00:00.000Z');
    expect(appData.memory).toEqual({
      facts: [],
      recentSummary: '',
      updatedAt: '2026-05-30T12:00:00.000Z',
    });
    expect(appData.events).toEqual([]);
    expect(appData.dailyCare.tasks.map((task) => task.kind)).toEqual(['feed', 'chat', 'focus', 'rest', 'reflect']);
    expect(appData.journal).toEqual([]);
    expect(appData.settings.providerId).toBe('deepseek');
  });

  it('rejects malformed JSON', () => {
    expect(() => parsePetAdoptionText('{not json')).toThrow('这个领养档案无法读取');
  });

  it('rejects documents with the wrong format', () => {
    expect(() => parsePetAdoptionText(JSON.stringify({
      ...validDocument,
      format: 'other-product',
    }))).toThrow('这不是本产品的领养档案');
  });

  it('rejects unsupported versions', () => {
    expect(() => parsePetAdoptionText(JSON.stringify({
      ...validDocument,
      version: 2,
    }))).toThrow('这个领养档案版本太新，请更新客户端');
  });

  it('rejects empty names', () => {
    expect(() => parsePetAdoptionText(JSON.stringify({
      ...validDocument,
      profile: { ...validDocument.profile, name: '   ' },
    }))).toThrow('领养档案不完整，请重新下载');
  });

  it('rejects invalid calendar dates', () => {
    expect(() => parsePetAdoptionText(JSON.stringify({
      ...validDocument,
      createdAt: '2026-02-31T12:00:00.000Z',
    }))).toThrow('领养档案不完整，请重新下载');
  });

  it('rejects non-ISO-ish dates', () => {
    expect(() => parsePetAdoptionText(JSON.stringify({
      ...validDocument,
      createdAt: '123',
    }))).toThrow('领养档案不完整，请重新下载');
  });

  it('rejects missing or empty adoption ids', () => {
    expect(() => parsePetAdoptionText(JSON.stringify({
      ...validDocument,
      adoptionId: '',
    }))).toThrow('领养档案不完整，请重新下载');

    expect(() => parsePetAdoptionText(JSON.stringify({
      ...validDocument,
      adoptionId: undefined,
    }))).toThrow('领养档案不完整，请重新下载');
  });

  it('rejects adoption ids without the pet prefix', () => {
    expect(() => parsePetAdoptionText(JSON.stringify({
      ...validDocument,
      adoptionId: 'abc123',
    }))).toThrow('领养档案不完整，请重新下载');
  });

  it('rejects missing or empty species', () => {
    expect(() => parsePetAdoptionText(JSON.stringify({
      ...validDocument,
      profile: { ...validDocument.profile, species: '   ' },
    }))).toThrow('领养档案不完整，请重新下载');

    expect(() => parsePetAdoptionText(JSON.stringify({
      ...validDocument,
      profile: { ...validDocument.profile, species: undefined },
    }))).toThrow('领养档案不完整，请重新下载');
  });

  it('rejects non-object JSON roots', () => {
    expect(() => parsePetAdoptionText(JSON.stringify([]))).toThrow('这个领养档案无法读取');
  });

  it('rejects unsupported personas', () => {
    expect(() => parsePetAdoptionText(JSON.stringify({
      ...validDocument,
      profile: { ...validDocument.profile, personaId: 'pirate' },
    }))).toThrow('这个宠物性格暂不支持');
  });

  it('normalizes invalid avatar fields instead of rejecting the document', () => {
    const adoption = parsePetAdoptionText(JSON.stringify({
      ...validDocument,
      profile: {
        ...validDocument.profile,
        avatar: {
          body: 'dragon',
          primaryColor: 'blue',
          secondaryColor: '#fff1bf',
          eyeStyle: 'laser',
          mouthStyle: 'cat',
          cheekStyle: 'pink',
          accessory: 'none',
        },
      },
    }));

    expect(adoption.profile.avatar).toEqual(defaultPetAvatar());
  });
});
