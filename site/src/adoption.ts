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

  return {
    format: petAdoptionFormat,
    version: supportedPetAdoptionVersion,
    adoptionId: options.id ?? createAdoptionId(),
    createdAt,
    profile: {
      name: profile.name.trim(),
      species: profile.species.trim(),
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

  link.href = url;
  link.download = 'adoption.pet';
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function createAdoptionId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') {
    return `pet_${cryptoApi.randomUUID().replaceAll('-', '')}`;
  }

  return `pet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
