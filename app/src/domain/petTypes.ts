export type PetMood = 'happy' | 'calm' | 'lonely' | 'sleepy' | 'hungry' | 'confused' | 'sick' | 'bored';

export type PetAction =
  | 'idle'
  | 'thinking'
  | 'happy'
  | 'confused'
  | 'sleepy'
  | 'hungry'
  | 'affectionate'
  | 'cleaning'
  | 'focused'
  | 'sick';

export type PetPersonaId = 'healing' | 'tsundere' | 'studyBuddy' | 'energetic';

export type PetEventKind = 'feed' | 'pet' | 'chat' | 'rest' | 'ignore' | 'clean' | 'focus' | 'reflect';
export type PetLifeStage = 'child' | 'teen' | 'adult';
export type PetSleepState = 'awake' | 'drowsy' | 'sleeping' | 'sick';
export type PetAvatarBody = 'cat' | 'bear' | 'bunny' | 'blob';
export type PetAvatarEyeStyle = 'dot' | 'sparkle' | 'sleepy';
export type PetAvatarMouthStyle = 'smile' | 'cat' | 'shy';
export type PetAvatarCheekStyle = 'none' | 'pink' | 'peach';
export type PetAvatarAccessory = 'none' | 'bow' | 'cap' | 'headphones' | 'scarf';

export interface PetAvatar {
  body: PetAvatarBody;
  primaryColor: string;
  secondaryColor: string;
  eyeStyle: PetAvatarEyeStyle;
  mouthStyle: PetAvatarMouthStyle;
  cheekStyle: PetAvatarCheekStyle;
  accessory: PetAvatarAccessory;
}

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
  cleanliness: number;
  health: number;
  boredom: number;
  trust: number;
  lifeStage: PetLifeStage;
  sleepState: PetSleepState;
  level: number;
  experience: number;
  coins: number;
  action: PetAction;
  lastInteractionAt: string;
  lastCareAt: string;
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
  avatar: PetAvatar;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export type ProviderProtocol = 'openai-chat' | 'openai-responses' | 'anthropic-messages' | 'gemini-openai';
export type ProviderAuth = 'bearer' | 'x-api-key' | 'none';

export interface ModelSettings {
  providerId: string;
  protocol: ProviderProtocol;
  auth: ProviderAuth;
  baseUrl: string;
  model: string;
  temperature: number;
  customHeaders: Record<string, string>;
}

export interface MemorySummary {
  facts: string[];
  recentSummary: string;
  updatedAt: string;
}

export type DailyTaskKind = 'feed' | 'chat' | 'focus' | 'rest' | 'reflect';

export interface DailyTask {
  id: string;
  kind: DailyTaskKind;
  label: string;
  rewardCoins: number;
  rewardExperience: number;
  completedAt?: string;
}

export interface DailyCare {
  date: string;
  tasks: DailyTask[];
}

export interface PetJournalEntry {
  date: string;
  createdAt: string;
  meals: string[];
  conversations: string[];
  moodTrail: string[];
  remembered: string[];
  relationship: string;
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
