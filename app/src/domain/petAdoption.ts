import { ensureDailyCare } from './petLifecycle';
import { emptyMemory } from './memory';
import { defaultModelSettings } from './modelSettings';
import { normalizePetAvatar } from './petAvatar';
import { createInitialPetState } from './petState';
import {
  petPersonaIds,
  type DailyCare,
  type MemorySummary,
  type ModelSettings,
  type PetEvent,
  type PetJournalEntry,
  type PetPersonaId,
  type PetProfile,
  type PetState,
} from './petTypes';

export const petAdoptionFormat = 'desktop-ai-pet-adoption';
export const supportedPetAdoptionVersion = 1;

export interface PetAdoptionDocument {
  format: typeof petAdoptionFormat;
  version: typeof supportedPetAdoptionVersion;
  adoptionId: string;
  createdAt: string;
  profile: PetProfile;
}

export interface AdoptedAppData {
  profile: PetProfile;
  state: PetState;
  settings: ModelSettings;
  memory: MemorySummary;
  events: PetEvent[];
  dailyCare: DailyCare;
  journal: PetJournalEntry[];
}

type UnknownRecord = Record<string, unknown>;
const isoUtcTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const adoptionIdPattern = /^pet_[A-Za-z0-9_-]{1,64}$/;

export function parsePetAdoptionText(rawText: string): PetAdoptionDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('这个领养档案无法读取');
  }

  const root = requireRecord(parsed, 'root');
  if (root.format !== petAdoptionFormat) {
    throw new Error('这不是本产品的领养档案');
  }
  if (root.version !== supportedPetAdoptionVersion) {
    throw new Error('这个领养档案版本太新，请更新客户端');
  }

  const createdAt = requireIsoDate(root.createdAt);
  const profile = requireRecord(root.profile, 'profile');
  const personaId = requirePersona(profile.personaId);

  return {
    format: petAdoptionFormat,
    version: supportedPetAdoptionVersion,
    adoptionId: requireAdoptionId(root.adoptionId),
    createdAt,
    profile: {
      name: requireText(profile.name),
      species: requireText(profile.species),
      personaId,
      createdAt,
      avatar: normalizePetAvatar(isRecord(profile.avatar) ? profile.avatar : undefined),
    },
  };
}

export function createAppDataFromPetAdoption(adoption: PetAdoptionDocument): AdoptedAppData {
  return {
    profile: adoption.profile,
    state: createInitialPetState(adoption.createdAt),
    settings: { ...defaultModelSettings },
    memory: emptyMemory(adoption.createdAt),
    events: [],
    dailyCare: ensureDailyCare(undefined, adoption.createdAt),
    journal: [],
  };
}

function requireRecord(value: unknown, label: string): UnknownRecord {
  if (!isRecord(value)) {
    throw new Error(label === 'root' ? '这个领养档案无法读取' : '领养档案不完整，请重新下载');
  }
  return value;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireText(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('领养档案不完整，请重新下载');
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('领养档案不完整，请重新下载');
  }
  return trimmed;
}

function requireIsoDate(value: unknown): string {
  const text = requireText(value);
  const date = new Date(text);
  if (!isoUtcTimestampPattern.test(text) || Number.isNaN(date.getTime()) || date.toISOString() !== text) {
    throw new Error('领养档案不完整，请重新下载');
  }
  return text;
}

function requireAdoptionId(value: unknown): string {
  const adoptionId = requireText(value);
  if (!adoptionIdPattern.test(adoptionId)) {
    throw new Error('领养档案不完整，请重新下载');
  }
  return adoptionId;
}

function requirePersona(value: unknown): PetPersonaId {
  if (typeof value === 'string' && petPersonaIds.includes(value as PetPersonaId)) {
    return value as PetPersonaId;
  }
  throw new Error('这个宠物性格暂不支持');
}
