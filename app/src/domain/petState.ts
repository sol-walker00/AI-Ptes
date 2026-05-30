import type { PetEvent, PetEventKind, PetMood, PetState } from './petTypes';

export type PetInteraction = PetEventKind;

export interface PetInteractionContext {
  id?: string;
  intensity?: number;
  quality?: number;
  userText?: string;
  note?: string;
}

type MoodInput = Pick<PetState, 'hunger' | 'energy' | 'intimacy'>;

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const clampUnit = (value: number) => Math.max(0, Math.min(1, Number(value.toFixed(2))));
const maxEventHistory = 80;

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

export function createPetEvent(
  kind: PetInteraction,
  createdAt: string,
  context: PetInteractionContext = {},
): PetEvent {
  const note = context.userText?.trim() || context.note?.trim() || undefined;

  return {
    id: context.id ?? `${kind}-${createdAt}`,
    kind,
    createdAt,
    intensity: clampUnit(context.intensity ?? inferIntensity(kind, note)),
    quality: clampUnit(context.quality ?? inferQuality(kind, note)),
    ...(note ? { note } : {}),
  };
}

export function appendPetEvent(events: PetEvent[], event: PetEvent): PetEvent[] {
  return [...events, event].slice(-maxEventHistory);
}

export function applyInteraction(
  state: PetState,
  interaction: PetInteraction,
  nowIso: string,
  previousEvents: PetEvent[] = [],
  context: PetInteractionContext = {},
): PetState {
  return applyPetEvent(state, createPetEvent(interaction, nowIso, context), previousEvents);
}

export function applyPetEvent(
  state: PetState,
  event: PetEvent,
  previousEvents: PetEvent[] = [],
): PetState {
  const base = restoreStateAfterTime(state, event.createdAt);
  const repetition = repetitionFactor(previousEvents, event.kind, event.createdAt);

  const changed: PetState =
    event.kind === 'feed'
      ? applyFeedEvent(base, event, previousEvents, repetition)
      : event.kind === 'pet'
        ? applyPettingEvent(base, event, repetition)
        : event.kind === 'chat'
          ? applyChatEvent(base, event, repetition)
          : event.kind === 'rest'
            ? applyRestEvent(base, repetition)
            : {
                ...base,
                hunger: clamp(base.hunger + 1),
                intimacy: clamp(base.intimacy - 1),
                action: 'idle',
              };

  return {
    ...changed,
    mood: deriveEventMood(changed),
    lastInteractionAt: event.createdAt,
  };
}

export function restoreStateAfterTime(state: PetState, nowIso: string): PetState {
  const previous = Date.parse(state.lastInteractionAt);
  const current = Date.parse(nowIso);
  const elapsedHours = Math.max(0, (current - previous) / 3_600_000);
  const sleeping = state.action === 'sleepy' || isNightHour(nowIso);
  const energyDrift = sleeping
    ? elapsedHours * 8
    : elapsedHours >= 1
      ? elapsedHours * 2
      : elapsedHours * -0.5;

  const changed: PetState = {
    ...state,
    hunger: clamp(state.hunger + elapsedHours * 4),
    energy: clamp(state.energy + energyDrift),
    intimacy: clamp(state.intimacy - elapsedHours * 0.25),
    action: elapsedHours >= 2 ? 'idle' : state.action,
    lastInteractionAt: nowIso,
  };

  return {
    ...changed,
    mood: deriveMood(changed),
  };
}

function applyFeedEvent(
  state: PetState,
  event: PetEvent,
  previousEvents: PetEvent[],
  repetition: number,
): PetState {
  const lastFeedMinutes = minutesSinceLastEvent(previousEvents, 'feed', event.createdAt);
  const overfed = lastFeedMinutes !== null && lastFeedMinutes < 45 && state.hunger < 60;

  if (overfed) {
    return {
      ...state,
      hunger: clamp(state.hunger - 6),
      energy: clamp(state.energy - 1),
      intimacy: clamp(state.intimacy - 1),
      action: 'confused',
    };
  }

  const hungerDrop = state.hunger >= 80 ? 43 : state.hunger >= 45 ? 30 : 18;
  const intimacyGain = Math.round((2 + event.quality * 3) * repetition);

  return {
    ...state,
    hunger: clamp(state.hunger - hungerDrop),
    energy: clamp(state.energy + 3),
    intimacy: clamp(state.intimacy + intimacyGain),
    action: 'happy',
  };
}

function applyPettingEvent(state: PetState, event: PetEvent, repetition: number): PetState {
  const intimacyGain = Math.round(5 * event.quality * repetition);

  return {
    ...state,
    hunger: clamp(state.hunger),
    energy: clamp(state.energy),
    intimacy: clamp(state.intimacy + intimacyGain),
    action: intimacyGain <= 1 ? 'confused' : 'affectionate',
  };
}

function applyChatEvent(state: PetState, event: PetEvent, repetition: number): PetState {
  const hungerCost = 1 + Math.round(event.intensity * 2);
  const energyCost = 4 + Math.round(event.intensity * 4);
  const intimacyGain = Math.round((1 + event.quality * 3) * repetition);

  return {
    ...state,
    hunger: clamp(state.hunger + hungerCost),
    energy: clamp(state.energy - energyCost),
    intimacy: clamp(state.intimacy + intimacyGain),
    action: 'thinking',
  };
}

function applyRestEvent(state: PetState, repetition: number): PetState {
  const energyGain = state.energy <= 25 ? 30 : 25;

  return {
    ...state,
    hunger: clamp(state.hunger + 2),
    energy: clamp(state.energy + energyGain),
    intimacy: clamp(state.intimacy + Math.round(repetition)),
    action: 'sleepy',
  };
}

function deriveEventMood(state: PetState): PetMood {
  if (state.action === 'confused') return 'confused';
  if ((state.action === 'happy' || state.action === 'affectionate') && state.hunger < 75 && state.energy > 20) {
    return 'happy';
  }
  return deriveMood(state);
}

function repetitionFactor(events: PetEvent[], kind: PetInteraction, nowIso: string) {
  const repeated = events.filter((event) => event.kind === kind && minutesBetween(event.createdAt, nowIso) <= 15).length;
  if (repeated >= 3) return 0.1;
  if (repeated === 2) return 0.3;
  if (repeated === 1) return 0.6;
  return 1;
}

function minutesSinceLastEvent(events: PetEvent[], kind: PetInteraction, nowIso: string): number | null {
  const times = events
    .filter((event) => event.kind === kind)
    .map((event) => minutesBetween(event.createdAt, nowIso))
    .filter((minutes) => Number.isFinite(minutes) && minutes >= 0);

  return times.length > 0 ? Math.min(...times) : null;
}

function minutesBetween(previousIso: string, currentIso: string) {
  return Math.max(0, (Date.parse(currentIso) - Date.parse(previousIso)) / 60_000);
}

function inferIntensity(kind: PetInteraction, note?: string) {
  if (kind !== 'chat') return 0.5;
  if (!note) return 0.35;
  return note.length >= 20 ? 0.65 : 0.5;
}

function inferQuality(kind: PetInteraction, note?: string) {
  if (kind === 'feed' || kind === 'pet' || kind === 'rest') return 0.65;
  if (!note) return 0.45;
  if (/(累|难过|焦虑|害怕|烦|开心|谢谢|陪|抱|喜欢|加油)/.test(note)) return 0.9;
  return note.length >= 18 ? 0.75 : 0.55;
}

function isNightHour(nowIso: string) {
  const hour = new Date(nowIso).getHours();
  return hour >= 22 || hour < 7;
}
