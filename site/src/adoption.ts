import { normalizePetAvatar } from '@desktop-pet/domain/petAvatar';
import {
  petAdoptionFormat,
  supportedPetAdoptionVersion,
  type PetAdoptionDocument,
} from '@desktop-pet/domain/petAdoption';
import type { PetAvatar, PetPersonaId } from '@desktop-pet/domain/petTypes';

export interface AdoptionProfileInput {
  name: string;
  species: string;
  personaId: PetPersonaId;
  avatar: PetAvatar;
}

export interface AdoptionDocumentOptions {
  id?: string;
  createdAt?: string;
}

export function createAdoptionDocument(
  profile: AdoptionProfileInput,
  options: AdoptionDocumentOptions = {},
): PetAdoptionDocument {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const name = profile.name.trim();
  const species = profile.species.trim();

  if (!name) {
    throw new Error('宠物名字不能为空');
  }
  if (!species) {
    throw new Error('宠物形象不能为空');
  }

  return {
    format: petAdoptionFormat,
    version: supportedPetAdoptionVersion,
    adoptionId: options.id ?? createAdoptionId(),
    createdAt,
    profile: {
      name,
      species,
      personaId: profile.personaId,
      createdAt,
      avatar: normalizePetAvatar(profile.avatar),
    },
  };
}

export function downloadAdoptionDocument(document: PetAdoptionDocument): void {
  const blob = new Blob([`${JSON.stringify(document, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  let attached = false;

  link.href = url;
  link.download = 'adoption.pet';
  try {
    window.document.body.appendChild(link);
    attached = true;
    link.click();
  } finally {
    if (attached) {
      window.document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }
}

function createAdoptionId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') {
    return `pet_${cryptoApi.randomUUID().replace(/-/g, '')}`;
  }

  return `pet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
