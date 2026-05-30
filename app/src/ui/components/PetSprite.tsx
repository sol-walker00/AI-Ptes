import { defaultPetAvatar } from '../../domain/petAvatar';
import type { PetAction, PetAvatar } from '../../domain/petTypes';
import { CartoonAvatar } from './CartoonAvatar';

export function PetSprite({ action, avatar = defaultPetAvatar() }: { action: PetAction; avatar?: PetAvatar }) {
  return (
    <CartoonAvatar avatar={avatar} className={`pet-sprite pet-sprite-${action}`} />
  );
}
