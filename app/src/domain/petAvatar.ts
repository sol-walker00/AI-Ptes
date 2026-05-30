import type {
  PetAvatar,
  PetAvatarAccessory,
  PetAvatarBody,
  PetAvatarCheekStyle,
  PetAvatarEyeStyle,
  PetAvatarMouthStyle,
} from './petTypes';

export const avatarBodies: Array<{ id: PetAvatarBody; label: string }> = [
  { id: 'cat', label: '猫咪' },
  { id: 'bear', label: '小熊' },
  { id: 'bunny', label: '兔兔' },
  { id: 'blob', label: '团子' },
];

export const avatarPalette = [
  '#f6c65b',
  '#9fd7ff',
  '#f7a8c7',
  '#9fd8b5',
  '#bba7ff',
  '#f29f7f',
];

export const avatarAccentPalette = [
  '#fff1bf',
  '#e4f5ff',
  '#ffe3ef',
  '#e5f8ed',
  '#eee8ff',
  '#ffe4d8',
];

export const avatarEyes: Array<{ id: PetAvatarEyeStyle; label: string }> = [
  { id: 'dot', label: '圆眼' },
  { id: 'sparkle', label: '星星眼' },
  { id: 'sleepy', label: '困困眼' },
];

export const avatarMouths: Array<{ id: PetAvatarMouthStyle; label: string }> = [
  { id: 'cat', label: '猫嘴' },
  { id: 'smile', label: '微笑' },
  { id: 'shy', label: '害羞' },
];

export const avatarCheeks: Array<{ id: PetAvatarCheekStyle; label: string }> = [
  { id: 'pink', label: '粉脸' },
  { id: 'peach', label: '桃脸' },
  { id: 'none', label: '无' },
];

export const avatarAccessories: Array<{ id: PetAvatarAccessory; label: string }> = [
  { id: 'none', label: '无' },
  { id: 'bow', label: '蝴蝶结' },
  { id: 'cap', label: '小帽子' },
  { id: 'headphones', label: '耳机' },
  { id: 'scarf', label: '围巾' },
];

export function defaultPetAvatar(): PetAvatar {
  return {
    body: 'cat',
    primaryColor: '#f6c65b',
    secondaryColor: '#fff1bf',
    eyeStyle: 'dot',
    mouthStyle: 'cat',
    cheekStyle: 'pink',
    accessory: 'none',
  };
}

export function normalizePetAvatar(input: Partial<Record<keyof PetAvatar, unknown>> | null | undefined): PetAvatar {
  const fallback = defaultPetAvatar();

  return {
    body: optionOrDefault(input?.body, avatarBodies, fallback.body),
    primaryColor: colorOrDefault(input?.primaryColor, fallback.primaryColor),
    secondaryColor: colorOrDefault(input?.secondaryColor, fallback.secondaryColor),
    eyeStyle: optionOrDefault(input?.eyeStyle, avatarEyes, fallback.eyeStyle),
    mouthStyle: optionOrDefault(input?.mouthStyle, avatarMouths, fallback.mouthStyle),
    cheekStyle: optionOrDefault(input?.cheekStyle, avatarCheeks, fallback.cheekStyle),
    accessory: optionOrDefault(input?.accessory, avatarAccessories, fallback.accessory),
  };
}

function optionOrDefault<T extends string>(
  value: unknown,
  options: Array<{ id: T }>,
  fallback: T,
): T {
  return typeof value === 'string' && options.some((option) => option.id === value) ? value as T : fallback;
}

function colorOrDefault(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}
