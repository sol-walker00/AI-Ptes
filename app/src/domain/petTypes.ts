export type PetMood = 'happy' | 'calm' | 'lonely' | 'sleepy' | 'hungry' | 'confused';

export type PetAction =
  | 'idle'
  | 'thinking'
  | 'happy'
  | 'confused'
  | 'sleepy'
  | 'hungry'
  | 'affectionate';

export type PetPersonaId = 'healing' | 'tsundere' | 'studyBuddy' | 'energetic';

export type PetEventKind = 'feed' | 'pet' | 'chat' | 'rest' | 'ignore';

export interface PetPersona {
  id: PetPersonaId;
  label: string;
  speechStyle: string;
  relationshipRule: string;
}

export interface PetState {
  mood: PetMood;
  hunger: number;
  energy: number;
  intimacy: number;
  action: PetAction;
  lastInteractionAt: string;
}

export interface PetEvent {
  id: string;
  kind: PetEventKind;
  createdAt: string;
  intensity: number;
  quality: number;
  note?: string;
}

export interface PetProfile {
  name: string;
  species: string;
  personaId: PetPersonaId;
  createdAt: string;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface ModelSettings {
  baseUrl: string;
  model: string;
  temperature: number;
}

export interface MemorySummary {
  facts: string[];
  recentSummary: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'pet';
  content: string;
  createdAt: string;
}

export interface PetReply {
  text: string;
  action: PetAction;
  nextState: PetState;
}
