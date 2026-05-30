import { describe, expect, it } from 'vitest';
import { defaultPetAvatar, normalizePetAvatar } from './petAvatar';

describe('petAvatar', () => {
  it('creates a default honey cat avatar for new and legacy profiles', () => {
    const avatar = defaultPetAvatar();

    expect(avatar).toEqual({
      body: 'cat',
      primaryColor: '#f6c65b',
      secondaryColor: '#fff1bf',
      eyeStyle: 'dot',
      mouthStyle: 'cat',
      cheekStyle: 'pink',
      accessory: 'none',
    });
    expect(normalizePetAvatar(undefined)).toEqual(avatar);
  });

  it('keeps known selections while filling missing legacy fields', () => {
    expect(normalizePetAvatar({
      body: 'bunny',
      primaryColor: '#9fd7ff',
      accessory: 'headphones',
    })).toEqual({
      body: 'bunny',
      primaryColor: '#9fd7ff',
      secondaryColor: '#fff1bf',
      eyeStyle: 'dot',
      mouthStyle: 'cat',
      cheekStyle: 'pink',
      accessory: 'headphones',
    });
  });

  it('falls back from invalid legacy values', () => {
    expect(normalizePetAvatar({
      body: 'dragon',
      primaryColor: 'blue',
      eyeStyle: 'laser',
      accessory: 'cape',
    })).toEqual(defaultPetAvatar());
  });
});
