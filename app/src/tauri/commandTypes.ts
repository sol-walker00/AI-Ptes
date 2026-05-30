import type {
  ChatMessage,
  DailyCare,
  MemorySummary,
  ModelSettings,
  PetEvent,
  PetJournalEntry,
  PetProfile,
  PetState,
} from '../domain/petTypes';
import type { AiMessage } from '../domain/petBrain';

export interface AppData {
  profile: PetProfile | null;
  state: PetState | null;
  settings: ModelSettings;
  memory: MemorySummary;
  events: PetEvent[];
  dailyCare?: DailyCare | null;
  journal?: PetJournalEntry[] | null;
}

export interface AppDataSnapshot {
  data: AppData;
  revision: number;
}

export interface SendPetChatRequest {
  providerId: string;
  protocol: string;
  auth: string;
  baseUrl: string;
  model: string;
  temperature: number;
  customHeaders: Record<string, string>;
  messages: AiMessage[];
}

export interface SendPetChatResponse {
  text: string;
}

export interface UiChatMessage extends ChatMessage {
  pending?: boolean;
}
