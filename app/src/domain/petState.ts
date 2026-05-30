import type { PetMood, PetState } from './petTypes';

export type PetInteraction = 'feed' | 'pet' | 'chat' | 'rest';

type MoodInput = Pick<PetState, 'hunger' | 'energy' | 'intimacy'>;

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function deriveMood(input: MoodInput): PetMood {
  if (input.hunger >= 75) return 'hungry';
  if (input.energy <= 20) return 'sleepy';
  if (input.intimacy <= 5) return 'lonely';
  if (input.intimacy >= 60 && input.energy >= 45 && input.hunger <= 45) return 'happy';
  return 'calm';
}

export function createInitialPetState(nowIso: string): PetState {
  return {
    mood: 'calm',
    hunger: 20,
    energy: 80,
    intimacy: 10,
    action: 'idle',
    lastInteractionAt: nowIso,
  };
}

export function applyInteraction(
  state: PetState,
  interaction: PetInteraction,
  nowIso: string,
): PetState {
  const base = restoreStateAfterTime(state, nowIso);

  const changed: PetState =
    interaction === 'feed'
      ? {
          ...base,
          hunger: clamp(base.hunger - 25),
          energy: clamp(base.energy + 2),
          intimacy: clamp(base.intimacy + 3),
          action: 'happy',
        }
      : interaction === 'pet'
        ? {
            ...base,
            hunger: clamp(base.hunger + 1),
            energy: clamp(base.energy + 1),
            intimacy: clamp(base.intimacy + 4),
            action: 'affectionate',
          }
        : interaction === 'chat'
          ? {
              ...base,
              hunger: clamp(base.hunger + 2),
              energy: clamp(base.energy - 6),
              intimacy: clamp(base.intimacy + 2),
              action: 'thinking',
            }
          : {
              ...base,
              hunger: clamp(base.hunger + 1),
              energy: clamp(base.energy + 15),
              intimacy: clamp(base.intimacy + 1),
              action: 'sleepy',
            };

  return {
    ...changed,
    mood: interaction === 'feed' || interaction === 'pet' ? 'happy' : deriveMood(changed),
    lastInteractionAt: nowIso,
  };
}

export function restoreStateAfterTime(state: PetState, nowIso: string): PetState {
  const previous = Date.parse(state.lastInteractionAt);
  const current = Date.parse(nowIso);
  const elapsedHours = Math.max(0, (current - previous) / 3_600_000);

  const changed: PetState = {
    ...state,
    hunger: clamp(state.hunger + elapsedHours * 6),
    energy: clamp(state.energy - elapsedHours * 3),
    intimacy: clamp(state.intimacy - elapsedHours * 0.5),
    action: elapsedHours >= 2 ? 'idle' : state.action,
    lastInteractionAt: nowIso,
  };

  return {
    ...changed,
    mood: deriveMood(changed),
  };
}
