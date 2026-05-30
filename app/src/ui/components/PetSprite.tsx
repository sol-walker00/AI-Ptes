import petUrl from '../../assets/pet.svg';
import type { PetAction } from '../../domain/petTypes';

export function PetSprite({ action }: { action: PetAction }) {
  return (
    <img
      className={`pet-sprite pet-sprite-${action}`}
      src={petUrl}
      alt="AI pet"
      draggable={false}
    />
  );
}
