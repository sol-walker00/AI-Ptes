import type { ChatMessage, MemorySummary, ModelSettings, PetEvent, PetProfile, PetState } from '../domain/petTypes';
import type { AiMessage } from '../domain/petBrain';

export interface AppData {
  profile: PetProfile | null;
  state: PetState | null;
  settings: ModelSettings;
  memory: MemorySummary;
  events: PetEvent[];
}

export interface SendPetChatRequest {
  baseUrl: string;
  model: string;
  temperature: number;
  messages: AiMessage[];
}

export interface SendPetChatResponse {
  text: string;
}

export interface UiChatMessage extends ChatMessage {
  pending?: boolean;
}
