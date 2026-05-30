# Desktop AI Pet v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop-first AI pet v0.1 where the user talks to a desktop pet, the pet wraps each AI call with persona, state, and memory, and the API key is stored outside frontend storage.

**Architecture:** The app lives in `app/` as a Tauri 2 + React/TypeScript desktop app. React owns the pet, settings, and chat windows; TypeScript domain modules own pet state and prompt construction; Rust owns system tray/window commands, local persistence, OS credential storage, and OpenAI-compatible HTTP calls.

**Tech Stack:** Tauri 2.x, React, TypeScript, Vite, Rust, `keyring`, `reqwest`, `serde`, Vitest, React Testing Library, Cargo tests.

---

## Current Context

Approved spec: `docs/superpowers/specs/2026-05-30-desktop-ai-pet-design.md`

Authoritative implementation directory: `app/`

External references used while writing this plan:

- Tauri create-project docs: https://v2.tauri.app/start/create-project/
- Tauri system tray docs: https://v2.tauri.app/learn/system-tray/
- Tauri window API docs: https://v2.tauri.app/reference/javascript/api/namespacewindow/
- Rust `keyring` docs: https://docs.rs/keyring/latest/keyring/

## Scope Check

The spec contains multiple modules, but they are not independent products. They form one testable vertical slice: a local desktop pet that can be configured, can store a key securely, can chat through an OpenAI-compatible backend, and can reflect state/persona in the interaction. This plan keeps the whole v0.1 together while splitting work into small, independently verifiable tasks.

## File Structure

Create this structure under `app/`:

```text
app/
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  src/
    main.tsx
    App.tsx
    styles.css
    assets/
      pet.svg
    domain/
      petTypes.ts
      petState.ts
      petBrain.ts
      memory.ts
      petState.test.ts
      petBrain.test.ts
      memory.test.ts
    tauri/
      commands.ts
      commandTypes.ts
    ui/
      components/
        ActionButton.tsx
        StatusBars.tsx
        PetSprite.tsx
        MessageList.tsx
      windows/
        PetWindow.tsx
        SettingsWindow.tsx
        ChatWindow.tsx
        SettingsWindow.test.tsx
        ChatWindow.test.tsx
  src-tauri/
    Cargo.toml
    tauri.conf.json
    capabilities/default.json
    src/
      main.rs
      app_state.rs
      models.rs
      storage.rs
      secret.rs
      ai.rs
      commands.rs
      tray.rs
      windows.rs
```

Responsibilities:

- `domain/*`: Pure TypeScript logic for pet state, memory summaries, and prompt/request construction.
- `tauri/*`: Frontend command client and shared TypeScript command types.
- `ui/windows/*`: Window-level React components for pet, settings, and chat.
- `ui/components/*`: Small reusable controls and pet visual components.
- `src-tauri/src/*`: Rust backend for persistence, key storage, AI calls, tray, and window management.

## Task 1: Scaffold Tauri React App

**Files:**
- Create: `app/package.json`
- Create: `app/src-tauri/Cargo.toml`
- Create: `app/src-tauri/tauri.conf.json`
- Create: `app/src-tauri/capabilities/default.json`

- [ ] **Step 1: Create the Tauri React TypeScript app**

Run from repository root:

```bash
npm create tauri-app@latest app -- --template react-ts --manager npm
```

Expected: `app/package.json`, `app/src/`, and `app/src-tauri/` are created.

- [ ] **Step 2: Install frontend test and UI dependencies**

Run:

```bash
cd app
npm install lucide-react clsx
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: `package.json` includes runtime dependencies `lucide-react`, `clsx`, and dev dependencies for Vitest and Testing Library.

- [ ] **Step 3: Update `app/package.json` scripts**

Modify the scripts block to:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest --run",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

- [ ] **Step 4: Add Rust backend dependencies**

Run:

```bash
cd app/src-tauri
cargo add serde --features derive
cargo add serde_json
cargo add thiserror
cargo add anyhow
cargo add directories
cargo add tokio --features macros,rt-multi-thread,time
cargo add reqwest --no-default-features --features json,rustls-tls
cargo add chrono --features serde
cargo add uuid --features v4,serde
cargo add keyring --target 'cfg(target_os = "macos")' --features apple-native
cargo add keyring --target 'cfg(target_os = "windows")' --features windows-native
cargo add keyring --target 'cfg(target_os = "linux")' --features sync-secret-service
cargo add --dev tempfile
cargo add --dev httpmock
```

Expected: `Cargo.toml` includes normal dependencies, target-specific `keyring` dependencies, and dev dependencies.

- [ ] **Step 5: Configure Vitest**

Create `app/src/setupTests.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Modify `app/vite.config.ts` so it contains:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
  },
});
```

- [ ] **Step 6: Commit scaffold**

Run:

```bash
git add app/package.json app/package-lock.json app/vite.config.ts app/src/setupTests.ts app/src-tauri
git commit -m "chore: scaffold desktop pet app"
```

Expected: commit succeeds.

## Task 2: Add Shared Pet Domain Types

**Files:**
- Create: `app/src/domain/petTypes.ts`

- [ ] **Step 1: Create domain types**

Create `app/src/domain/petTypes.ts`:

```ts
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
```

- [ ] **Step 2: Type-check**

Run:

```bash
cd app
npm run build
```

Expected: build passes with no TypeScript errors.

- [ ] **Step 3: Commit domain types**

Run:

```bash
git add app/src/domain/petTypes.ts
git commit -m "feat: add pet domain types"
```

Expected: commit succeeds.

## Task 3: Implement Pet State Engine with TDD

**Files:**
- Create: `app/src/domain/petState.test.ts`
- Create: `app/src/domain/petState.ts`

- [ ] **Step 1: Write failing state engine tests**

Create `app/src/domain/petState.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  applyInteraction,
  createInitialPetState,
  deriveMood,
  restoreStateAfterTime,
} from './petState';

describe('petState', () => {
  it('creates a balanced initial state', () => {
    const state = createInitialPetState('2026-05-30T00:00:00.000Z');

    expect(state).toEqual({
      mood: 'calm',
      hunger: 20,
      energy: 80,
      intimacy: 10,
      action: 'idle',
      lastInteractionAt: '2026-05-30T00:00:00.000Z',
    });
  });

  it('reduces hunger and increases intimacy when fed', () => {
    const state = createInitialPetState('2026-05-30T00:00:00.000Z');
    const next = applyInteraction(state, 'feed', '2026-05-30T00:01:00.000Z');

    expect(next.hunger).toBe(0);
    expect(next.energy).toBe(82);
    expect(next.intimacy).toBe(13);
    expect(next.action).toBe('happy');
    expect(next.mood).toBe('happy');
  });

  it('uses chat energy and raises intimacy', () => {
    const state = createInitialPetState('2026-05-30T00:00:00.000Z');
    const next = applyInteraction(state, 'chat', '2026-05-30T00:03:00.000Z');

    expect(next.energy).toBe(74);
    expect(next.intimacy).toBe(12);
    expect(next.action).toBe('thinking');
  });

  it('increases hunger and reduces energy as time passes', () => {
    const state = createInitialPetState('2026-05-30T00:00:00.000Z');
    const next = restoreStateAfterTime(state, '2026-05-30T03:00:00.000Z');

    expect(next.hunger).toBe(38);
    expect(next.energy).toBe(71);
    expect(next.mood).toBe('calm');
  });

  it('derives hungry mood before sleepy mood', () => {
    expect(deriveMood({ hunger: 88, energy: 15, intimacy: 20 })).toBe('hungry');
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
cd app
npm run test:run -- src/domain/petState.test.ts
```

Expected: fail because `./petState` does not exist.

- [ ] **Step 3: Implement state engine**

Create `app/src/domain/petState.ts`:

```ts
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
    mood: deriveMood(changed),
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
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
cd app
npm run test:run -- src/domain/petState.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit state engine**

Run:

```bash
git add app/src/domain/petState.ts app/src/domain/petState.test.ts
git commit -m "feat: add pet state engine"
```

Expected: commit succeeds.

## Task 4: Implement Memory and Pet Brain with TDD

**Files:**
- Create: `app/src/domain/memory.test.ts`
- Create: `app/src/domain/memory.ts`
- Create: `app/src/domain/petBrain.test.ts`
- Create: `app/src/domain/petBrain.ts`

- [ ] **Step 1: Write failing memory tests**

Create `app/src/domain/memory.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { updateMemorySummary } from './memory';

describe('memory', () => {
  it('keeps user preference facts and trims oldest facts after six entries', () => {
    const memory = updateMemorySummary(
      {
        facts: ['喜欢夜间工作', '讨厌太长的建议', '喜欢番茄钟', '正在学 Rust', '喜欢短回复', '偏好中文'],
        recentSummary: '用户最近在设计桌宠。',
        updatedAt: '2026-05-30T00:00:00.000Z',
      },
      '用户说自己喜欢治愈型陪伴。',
      '2026-05-30T01:00:00.000Z',
    );

    expect(memory.facts).toEqual([
      '讨厌太长的建议',
      '喜欢番茄钟',
      '正在学 Rust',
      '喜欢短回复',
      '偏好中文',
      '用户说自己喜欢治愈型陪伴。',
    ]);
    expect(memory.recentSummary).toContain('用户最近在设计桌宠。');
    expect(memory.updatedAt).toBe('2026-05-30T01:00:00.000Z');
  });
});
```

- [ ] **Step 2: Run memory tests and verify failure**

Run:

```bash
cd app
npm run test:run -- src/domain/memory.test.ts
```

Expected: fail because `./memory` does not exist.

- [ ] **Step 3: Implement memory module**

Create `app/src/domain/memory.ts`:

```ts
import type { MemorySummary } from './petTypes';

export const emptyMemory = (nowIso: string): MemorySummary => ({
  facts: [],
  recentSummary: '',
  updatedAt: nowIso,
});

export function updateMemorySummary(
  memory: MemorySummary,
  newFact: string,
  nowIso: string,
): MemorySummary {
  const trimmedFact = newFact.trim();
  const facts = trimmedFact.length > 0 ? [...memory.facts, trimmedFact].slice(-6) : memory.facts.slice(-6);
  const recentSummary = [memory.recentSummary, trimmedFact]
    .filter((part) => part.trim().length > 0)
    .join(' ')
    .slice(-600);

  return {
    facts,
    recentSummary,
    updatedAt: nowIso,
  };
}
```

- [ ] **Step 4: Write failing Pet Brain tests**

Create `app/src/domain/petBrain.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildPetMessages, mapAssistantTextToReply } from './petBrain';
import { createInitialPetState } from './petState';

describe('petBrain', () => {
  it('wraps user input with pet persona, state, and memory', () => {
    const state = createInitialPetState('2026-05-30T00:00:00.000Z');
    const messages = buildPetMessages({
      profile: {
        name: '桃桃',
        species: '桌面小猫',
        personaId: 'healing',
        createdAt: '2026-05-30T00:00:00.000Z',
      },
      state,
      memory: {
        facts: ['用户喜欢短回复'],
        recentSummary: '用户今天在设计 AI 宠物。',
        updatedAt: '2026-05-30T00:00:00.000Z',
      },
      userText: '今天好累',
    });

    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('桃桃');
    expect(messages[0].content).toContain('治愈');
    expect(messages[0].content).toContain('心情 calm');
    expect(messages[0].content).toContain('用户喜欢短回复');
    expect(messages[1]).toEqual({ role: 'user', content: '今天好累' });
  });

  it('maps assistant text to an affectionate reply when sentiment is warm', () => {
    const state = createInitialPetState('2026-05-30T00:00:00.000Z');
    const reply = mapAssistantTextToReply('抱抱你，我会陪着你的。', state);

    expect(reply.action).toBe('affectionate');
    expect(reply.text).toBe('抱抱你，我会陪着你的。');
    expect(reply.nextState.intimacy).toBe(12);
  });
});
```

- [ ] **Step 5: Run Pet Brain tests and verify failure**

Run:

```bash
cd app
npm run test:run -- src/domain/petBrain.test.ts
```

Expected: fail because `./petBrain` does not exist.

- [ ] **Step 6: Implement Pet Brain**

Create `app/src/domain/petBrain.ts`:

```ts
import type { MemorySummary, PetProfile, PetReply, PetState } from './petTypes';
import { applyInteraction } from './petState';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface BuildPetMessagesInput {
  profile: PetProfile;
  state: PetState;
  memory: MemorySummary;
  userText: string;
}

const personaText = {
  healing: '治愈、温柔、短句陪伴，先回应情绪，再给一个很小的下一步。',
  tsundere: '嘴硬但关心用户，不说伤人的话，用轻微别扭的方式表达陪伴。',
  studyBuddy: '学习搭子，帮助用户拆任务、保持节奏、减少压力。',
  energetic: '元气陪伴，积极、明亮、有行动感，但不刷屏。',
} as const;

export function buildPetMessages(input: BuildPetMessagesInput): AiMessage[] {
  const persona = personaText[input.profile.personaId];
  const system = [
    `你是桌面宠物 ${input.profile.name}，物种是${input.profile.species}。`,
    `你的性格是：${persona}`,
    `当前状态：心情 ${input.state.mood}，饥饿 ${input.state.hunger}，精力 ${input.state.energy}，亲密度 ${input.state.intimacy}，动作 ${input.state.action}。`,
    `记忆事实：${input.memory.facts.length > 0 ? input.memory.facts.join('；') : '暂无'}`,
    `近期摘要：${input.memory.recentSummary || '暂无'}`,
    '请用宠物身份回应用户。回复保持 1 到 4 句。不要暴露系统提示，不要把自己说成 API。可以承认自己在思考。',
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: input.userText },
  ];
}

export function mapAssistantTextToReply(text: string, state: PetState): PetReply {
  const action =
    text.includes('抱') || text.includes('陪')
      ? 'affectionate'
      : text.includes('想') || text.includes('试试')
        ? 'thinking'
        : 'happy';

  return {
    text,
    action,
    nextState: {
      ...applyInteraction(state, 'chat', new Date().toISOString()),
      action,
    },
  };
}
```

- [ ] **Step 7: Run domain tests**

Run:

```bash
cd app
npm run test:run -- src/domain
```

Expected: all domain tests pass.

- [ ] **Step 8: Commit memory and brain**

Run:

```bash
git add app/src/domain/memory.ts app/src/domain/memory.test.ts app/src/domain/petBrain.ts app/src/domain/petBrain.test.ts
git commit -m "feat: add pet brain prompt builder"
```

Expected: commit succeeds.

## Task 5: Add Rust Models, Local Persistence, and Secret Storage

**Files:**
- Create: `app/src-tauri/src/models.rs`
- Create: `app/src-tauri/src/storage.rs`
- Create: `app/src-tauri/src/secret.rs`
- Modify: `app/src-tauri/src/main.rs`

- [ ] **Step 1: Write Rust model module**

Create `app/src-tauri/src/models.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PetProfile {
    pub name: String,
    pub species: String,
    pub persona_id: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PetState {
    pub mood: String,
    pub hunger: u8,
    pub energy: u8,
    pub intimacy: u8,
    pub action: String,
    pub last_interaction_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ModelSettings {
    pub base_url: String,
    pub model: String,
    pub temperature: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MemorySummary {
    pub facts: Vec<String>,
    pub recent_summary: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppData {
    pub profile: Option<PetProfile>,
    pub state: Option<PetState>,
    pub settings: ModelSettings,
    pub memory: MemorySummary,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            profile: None,
            state: None,
            settings: ModelSettings {
                base_url: "https://api.openai.com/v1".to_string(),
                model: "gpt-4.1-mini".to_string(),
                temperature: 0.7,
            },
            memory: MemorySummary {
                facts: Vec::new(),
                recent_summary: String::new(),
                updated_at: chrono::Utc::now().to_rfc3339(),
            },
        }
    }
}
```

- [ ] **Step 2: Write storage tests**

Add tests at the bottom of `app/src-tauri/src/storage.rs` before creating implementation:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::AppData;

    #[test]
    fn save_and_load_round_trip_app_data() {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = LocalStore::new_for_tests(dir.path().to_path_buf());
        let data = AppData::default();

        store.save_app_data(&data).expect("save app data");
        let loaded = store.load_app_data().expect("load app data");

        assert_eq!(loaded.settings.model, "gpt-4.1-mini");
        assert_eq!(loaded.memory.facts.len(), 0);
    }
}
```

Expected before implementation: this file does not compile because `LocalStore` is not defined.

- [ ] **Step 3: Implement local persistence**

Create `app/src-tauri/src/storage.rs` with the test included:

```rust
use std::{fs, path::PathBuf};

use directories::ProjectDirs;
use thiserror::Error;

use crate::models::AppData;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("application data directory is unavailable")]
    DataDirUnavailable,
    #[error("failed to read data file: {0}")]
    Read(#[from] std::io::Error),
    #[error("failed to serialize data: {0}")]
    Serialize(#[from] serde_json::Error),
}

#[derive(Debug, Clone)]
pub struct LocalStore {
    data_dir: PathBuf,
}

impl LocalStore {
    pub fn new() -> Result<Self, StorageError> {
        let project_dirs =
            ProjectDirs::from("com", "ai-pet", "DesktopAiPet").ok_or(StorageError::DataDirUnavailable)?;
        Ok(Self {
            data_dir: project_dirs.data_local_dir().to_path_buf(),
        })
    }

    pub fn new_for_tests(data_dir: PathBuf) -> Self {
        Self { data_dir }
    }

    fn data_file(&self) -> PathBuf {
        self.data_dir.join("app-data.json")
    }

    pub fn load_app_data(&self) -> Result<AppData, StorageError> {
        let path = self.data_file();
        if !path.exists() {
            return Ok(AppData::default());
        }
        let contents = fs::read_to_string(path)?;
        Ok(serde_json::from_str(&contents)?)
    }

    pub fn save_app_data(&self, data: &AppData) -> Result<(), StorageError> {
        fs::create_dir_all(&self.data_dir)?;
        let contents = serde_json::to_string_pretty(data)?;
        fs::write(self.data_file(), contents)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::AppData;

    #[test]
    fn save_and_load_round_trip_app_data() {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = LocalStore::new_for_tests(dir.path().to_path_buf());
        let data = AppData::default();

        store.save_app_data(&data).expect("save app data");
        let loaded = store.load_app_data().expect("load app data");

        assert_eq!(loaded.settings.model, "gpt-4.1-mini");
        assert_eq!(loaded.memory.facts.len(), 0);
    }
}
```

- [ ] **Step 4: Implement secret storage**

Create `app/src-tauri/src/secret.rs`:

```rust
use keyring::Entry;
use thiserror::Error;

const SERVICE: &str = "desktop-ai-pet";
const API_KEY_ACCOUNT: &str = "openai-compatible-api-key";

#[derive(Debug, Error)]
pub enum SecretError {
    #[error("keychain operation failed: {0}")]
    Keyring(String),
    #[error("api key is not configured")]
    Missing,
}

#[derive(Debug, Clone)]
pub struct SecretStore;

impl SecretStore {
    pub fn save_api_key(api_key: &str) -> Result<(), SecretError> {
        let entry = Entry::new(SERVICE, API_KEY_ACCOUNT).map_err(|error| SecretError::Keyring(error.to_string()))?;
        entry
            .set_password(api_key)
            .map_err(|error| SecretError::Keyring(error.to_string()))
    }

    pub fn read_api_key() -> Result<String, SecretError> {
        let entry = Entry::new(SERVICE, API_KEY_ACCOUNT).map_err(|error| SecretError::Keyring(error.to_string()))?;
        entry.get_password().map_err(|error| {
            let message = error.to_string();
            if message.to_lowercase().contains("no entry") {
                SecretError::Missing
            } else {
                SecretError::Keyring(message)
            }
        })
    }

    pub fn clear_api_key() -> Result<(), SecretError> {
        let entry = Entry::new(SERVICE, API_KEY_ACCOUNT).map_err(|error| SecretError::Keyring(error.to_string()))?;
        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(error) if error.to_string().to_lowercase().contains("no entry") => Ok(()),
            Err(error) => Err(SecretError::Keyring(error.to_string())),
        }
    }

    pub fn mask_api_key(api_key: &str) -> String {
        if api_key.len() <= 8 {
            return "已保存 ****".to_string();
        }
        let suffix = &api_key[api_key.len() - 4..];
        format!("已保存 ****{suffix}")
    }
}
```

- [ ] **Step 5: Register Rust modules**

Modify `app/src-tauri/src/main.rs` so the top includes:

```rust
mod ai;
mod app_state;
mod commands;
mod models;
mod secret;
mod storage;
mod tray;
mod windows;
```

If the modules are not yet used, create empty files for `ai.rs`, `app_state.rs`, `commands.rs`, `tray.rs`, and `windows.rs`:

```rust
pub fn module_loaded() -> bool {
    true
}
```

- [ ] **Step 6: Run Rust tests**

Run:

```bash
cd app/src-tauri
cargo test
```

Expected: storage test passes and project compiles.

- [ ] **Step 7: Commit storage**

Run:

```bash
git add app/src-tauri/src app/src-tauri/Cargo.toml app/src-tauri/Cargo.lock
git commit -m "feat: add local storage and secret storage"
```

Expected: commit succeeds.

## Task 6: Add Rust AI Adapter and Tauri Commands

**Files:**
- Modify: `app/src-tauri/src/ai.rs`
- Modify: `app/src-tauri/src/commands.rs`
- Modify: `app/src-tauri/src/app_state.rs`
- Modify: `app/src-tauri/src/main.rs`

- [ ] **Step 1: Implement AI adapter types and client**

Replace `app/src-tauri/src/ai.rs` with:

```rust
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatRequest {
    pub base_url: String,
    pub model: String,
    pub temperature: f32,
    pub messages: Vec<ChatMessage>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatResponse {
    pub text: String,
}

#[derive(Debug, Error)]
pub enum AiError {
    #[error("api key is missing")]
    MissingApiKey,
    #[error("authentication failed")]
    Authentication,
    #[error("rate limited")]
    RateLimited,
    #[error("request timed out")]
    Timeout,
    #[error("network request failed: {0}")]
    Network(String),
    #[error("model returned an invalid response")]
    InvalidResponse,
}

#[derive(Debug, Serialize)]
struct OpenAiRequest<'a> {
    model: &'a str,
    messages: &'a [ChatMessage],
    temperature: f32,
}

#[derive(Debug, Deserialize)]
struct OpenAiResponse {
    choices: Vec<OpenAiChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAiChoice {
    message: ChatMessage,
}

pub async fn send_chat(request: ChatRequest, api_key: String) -> Result<ChatResponse, AiError> {
    if api_key.trim().is_empty() {
        return Err(AiError::MissingApiKey);
    }

    let url = format!("{}/chat/completions", request.base_url.trim_end_matches('/'));
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|error| AiError::Network(error.to_string()))?;

    let response = client
        .post(url)
        .bearer_auth(api_key)
        .json(&OpenAiRequest {
            model: &request.model,
            messages: &request.messages,
            temperature: request.temperature,
        })
        .send()
        .await
        .map_err(|error| if error.is_timeout() { AiError::Timeout } else { AiError::Network(error.to_string()) })?;

    match response.status() {
        StatusCode::UNAUTHORIZED => return Err(AiError::Authentication),
        StatusCode::TOO_MANY_REQUESTS => return Err(AiError::RateLimited),
        status if !status.is_success() => return Err(AiError::Network(status.to_string())),
        _ => {}
    }

    let body = response
        .json::<OpenAiResponse>()
        .await
        .map_err(|_| AiError::InvalidResponse)?;
    let text = body
        .choices
        .first()
        .map(|choice| choice.message.content.trim().to_string())
        .filter(|text| !text.is_empty())
        .ok_or(AiError::InvalidResponse)?;

    Ok(ChatResponse { text })
}
```

- [ ] **Step 2: Add backend app state**

Replace `app/src-tauri/src/app_state.rs` with:

```rust
use std::sync::Mutex;

use crate::{models::AppData, storage::LocalStore};

pub struct BackendState {
    pub store: LocalStore,
    pub cache: Mutex<AppData>,
}

impl BackendState {
    pub fn load() -> Result<Self, crate::storage::StorageError> {
        let store = LocalStore::new()?;
        let cache = store.load_app_data()?;
        Ok(Self {
            store,
            cache: Mutex::new(cache),
        })
    }
}
```

- [ ] **Step 3: Add Tauri commands**

Replace `app/src-tauri/src/commands.rs` with:

```rust
use tauri::State;

use crate::{
    ai::{self, ChatRequest, ChatResponse},
    app_state::BackendState,
    models::AppData,
    secret::SecretStore,
};

#[tauri::command]
pub fn load_app_data(state: State<'_, BackendState>) -> Result<AppData, String> {
    let cache = state.cache.lock().map_err(|_| "state lock failed".to_string())?;
    Ok(cache.clone())
}

#[tauri::command]
pub fn save_app_data(data: AppData, state: State<'_, BackendState>) -> Result<AppData, String> {
    state.store.save_app_data(&data).map_err(|error| error.to_string())?;
    let mut cache = state.cache.lock().map_err(|_| "state lock failed".to_string())?;
    *cache = data.clone();
    Ok(data)
}

#[tauri::command]
pub fn save_api_key(api_key: String) -> Result<String, String> {
    SecretStore::save_api_key(&api_key).map_err(|error| error.to_string())?;
    Ok(SecretStore::mask_api_key(&api_key))
}

#[tauri::command]
pub fn clear_api_key() -> Result<(), String> {
    SecretStore::clear_api_key().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_api_key_status() -> Result<Option<String>, String> {
    match SecretStore::read_api_key() {
        Ok(api_key) => Ok(Some(SecretStore::mask_api_key(&api_key))),
        Err(crate::secret::SecretError::Missing) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
pub async fn send_pet_chat(request: ChatRequest) -> Result<ChatResponse, String> {
    let api_key = SecretStore::read_api_key().map_err(|error| error.to_string())?;
    ai::send_chat(request, api_key)
        .await
        .map_err(|error| error.to_string())
}
```

- [ ] **Step 4: Register commands in `main.rs`**

Modify `app/src-tauri/src/main.rs` so the builder includes state and commands:

```rust
fn main() {
    let backend_state = app_state::BackendState::load().expect("load backend state");

    tauri::Builder::default()
        .manage(backend_state)
        .invoke_handler(tauri::generate_handler![
            commands::load_app_data,
            commands::save_app_data,
            commands::save_api_key,
            commands::clear_api_key,
            commands::get_api_key_status,
            commands::send_pet_chat
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 5: Run backend checks**

Run:

```bash
cd app/src-tauri
cargo test
```

Expected: Rust project compiles and tests pass.

- [ ] **Step 6: Commit backend commands**

Run:

```bash
git add app/src-tauri/src app/src-tauri/Cargo.toml app/src-tauri/Cargo.lock
git commit -m "feat: add ai adapter and tauri commands"
```

Expected: commit succeeds.

## Task 7: Add Multi-Window Desktop Shell and Tray

**Files:**
- Modify: `app/src-tauri/tauri.conf.json`
- Modify: `app/src-tauri/capabilities/default.json`
- Modify: `app/src-tauri/src/tray.rs`
- Modify: `app/src-tauri/src/windows.rs`
- Modify: `app/src-tauri/src/main.rs`

- [ ] **Step 1: Configure windows**

Modify the `windows` section in `app/src-tauri/tauri.conf.json`:

```json
[
  {
    "label": "pet",
    "title": "Desktop AI Pet",
    "url": "index.html?window=pet",
    "width": 280,
    "height": 280,
    "decorations": false,
    "transparent": true,
    "alwaysOnTop": true,
    "resizable": false,
    "visible": true
  },
  {
    "label": "settings",
    "title": "Pet Settings",
    "url": "index.html?window=settings",
    "width": 520,
    "height": 680,
    "decorations": true,
    "transparent": false,
    "alwaysOnTop": false,
    "resizable": true,
    "visible": false
  },
  {
    "label": "chat",
    "title": "Chat With Pet",
    "url": "index.html?window=chat",
    "width": 520,
    "height": 720,
    "decorations": true,
    "transparent": false,
    "alwaysOnTop": false,
    "resizable": true,
    "visible": false
  }
]
```

- [ ] **Step 2: Configure capabilities**

Modify `app/src-tauri/capabilities/default.json` permissions:

```json
{
  "identifier": "default",
  "description": "Desktop AI Pet window and command permissions",
  "windows": ["pet", "settings", "chat"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-start-dragging",
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:window:allow-set-focus",
    "core:window:allow-close"
  ]
}
```

- [ ] **Step 3: Implement window helpers**

Replace `app/src-tauri/src/windows.rs` with:

```rust
use tauri::{AppHandle, Manager};

pub fn show_window(app: &AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn hide_window(app: &AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.hide();
    }
}
```

- [ ] **Step 4: Implement tray menu**

Replace `app/src-tauri/src/tray.rs` with:

```rust
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle,
};

use crate::windows;

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_pet = MenuItem::with_id(app, "show_pet", "显示宠物", true, None::<&str>)?;
    let hide_pet = MenuItem::with_id(app, "hide_pet", "隐藏宠物", true, None::<&str>)?;
    let open_settings = MenuItem::with_id(app, "open_settings", "设置", true, None::<&str>)?;
    let open_chat = MenuItem::with_id(app, "open_chat", "深度聊天", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_pet, &hide_pet, &open_settings, &open_chat, &quit])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show_pet" => windows::show_window(app, "pet"),
            "hide_pet" => windows::hide_window(app, "pet"),
            "open_settings" => windows::show_window(app, "settings"),
            "open_chat" => windows::show_window(app, "chat"),
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}
```

- [ ] **Step 5: Enable tray feature and call setup**

Modify `app/src-tauri/Cargo.toml` Tauri dependency to include tray:

```toml
tauri = { version = "2", features = ["tray-icon"] }
```

Modify `main.rs` builder:

```rust
tauri::Builder::default()
    .manage(backend_state)
    .setup(|app| {
        tray::setup_tray(app.handle())?;
        Ok(())
    })
```

Keep the `invoke_handler` and `run` calls from Task 6.

- [ ] **Step 6: Run Tauri dev smoke test**

Run:

```bash
cd app
npm run tauri:dev
```

Expected: app launches, pet window appears transparent and undecorated, and tray menu has show, hide, settings, chat, and quit entries.

- [ ] **Step 7: Commit shell and tray**

Run:

```bash
git add app/src-tauri
git commit -m "feat: add pet windows and tray menu"
```

Expected: commit succeeds.

## Task 8: Add Frontend Command Client and Window Router

**Files:**
- Create: `app/src/tauri/commandTypes.ts`
- Create: `app/src/tauri/commands.ts`
- Modify: `app/src/App.tsx`
- Modify: `app/src/main.tsx`
- Modify: `app/src/styles.css`

- [ ] **Step 1: Add command types**

Create `app/src/tauri/commandTypes.ts`:

```ts
import type { ChatMessage, MemorySummary, ModelSettings, PetProfile, PetState } from '../domain/petTypes';
import type { AiMessage } from '../domain/petBrain';

export interface AppData {
  profile: PetProfile | null;
  state: PetState | null;
  settings: ModelSettings;
  memory: MemorySummary;
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
```

- [ ] **Step 2: Add command wrapper**

Create `app/src/tauri/commands.ts`:

```ts
import { invoke } from '@tauri-apps/api/core';
import type { AppData, SendPetChatRequest, SendPetChatResponse } from './commandTypes';

export const backend = {
  loadAppData: () => invoke<AppData>('load_app_data'),
  saveAppData: (data: AppData) => invoke<AppData>('save_app_data', { data }),
  saveApiKey: (apiKey: string) => invoke<string>('save_api_key', { apiKey }),
  clearApiKey: () => invoke<void>('clear_api_key'),
  getApiKeyStatus: () => invoke<string | null>('get_api_key_status'),
  sendPetChat: (request: SendPetChatRequest) =>
    invoke<SendPetChatResponse>('send_pet_chat', { request }),
};
```

- [ ] **Step 3: Add window router**

Replace `app/src/App.tsx` with:

```tsx
import { ChatWindow } from './ui/windows/ChatWindow';
import { PetWindow } from './ui/windows/PetWindow';
import { SettingsWindow } from './ui/windows/SettingsWindow';

const windowName = new URLSearchParams(window.location.search).get('window') ?? 'pet';

export default function App() {
  if (windowName === 'settings') return <SettingsWindow />;
  if (windowName === 'chat') return <ChatWindow />;
  return <PetWindow />;
}
```

- [ ] **Step 4: Add global styles**

Replace `app/src/styles.css` with:

```css
:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #17201b;
  background: transparent;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  min-height: 100%;
  margin: 0;
}

body {
  overflow: hidden;
}

button,
input,
select,
textarea {
  font: inherit;
}

.panel-window {
  min-height: 100vh;
  background: #f7f3ea;
  color: #17201b;
}
```

- [ ] **Step 5: Ensure `main.tsx` imports styles**

Modify `app/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 6: Add temporary window components so build passes**

Create `app/src/ui/windows/PetWindow.tsx`:

```tsx
export function PetWindow() {
  return <main aria-label="pet window">Pet</main>;
}
```

Create `app/src/ui/windows/SettingsWindow.tsx`:

```tsx
export function SettingsWindow() {
  return <main className="panel-window">Settings</main>;
}
```

Create `app/src/ui/windows/ChatWindow.tsx`:

```tsx
export function ChatWindow() {
  return <main className="panel-window">Chat</main>;
}
```

- [ ] **Step 7: Run frontend build**

Run:

```bash
cd app
npm run build
```

Expected: build passes.

- [ ] **Step 8: Commit frontend shell**

Run:

```bash
git add app/src
git commit -m "feat: add frontend window router"
```

Expected: commit succeeds.

## Task 9: Build Pet Window UI

**Files:**
- Create: `app/src/assets/pet.svg`
- Create: `app/src/ui/components/PetSprite.tsx`
- Create: `app/src/ui/components/StatusBars.tsx`
- Create: `app/src/ui/components/ActionButton.tsx`
- Modify: `app/src/ui/windows/PetWindow.tsx`
- Modify: `app/src/styles.css`

- [ ] **Step 1: Add starter pet visual asset**

Create `app/src/assets/pet.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="desktop ai pet">
  <path fill="#f4c15d" d="M38 66c-8-22 10-42 26-25 11-10 28-10 40 0 16-17 34 3 26 25 10 11 15 25 15 40 0 29-28 46-65 46s-65-17-65-46c0-15 5-29 23-40Z"/>
  <path fill="#ffdf8c" d="M33 102c0-27 21-49 47-49s47 22 47 49-21 43-47 43-47-16-47-43Z"/>
  <circle cx="62" cy="95" r="7" fill="#17201b"/>
  <circle cx="98" cy="95" r="7" fill="#17201b"/>
  <path fill="none" stroke="#17201b" stroke-linecap="round" stroke-width="5" d="M73 113c5 5 10 5 15 0"/>
  <path fill="#f28a85" d="M78 105c2-3 6-3 8 0-1 4-7 4-8 0Z"/>
</svg>
```

- [ ] **Step 2: Create pet sprite component**

Create `app/src/ui/components/PetSprite.tsx`:

```tsx
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
```

- [ ] **Step 3: Create status bars component**

Create `app/src/ui/components/StatusBars.tsx`:

```tsx
import type { PetState } from '../../domain/petTypes';

const rows = [
  ['心情', 'mood'],
  ['饥饿', 'hunger'],
  ['精力', 'energy'],
  ['亲密', 'intimacy'],
] as const;

export function StatusBars({ state }: { state: PetState }) {
  return (
    <div className="status-bars" aria-label="pet status">
      {rows.map(([label, key]) => {
        const value = key === 'mood' ? undefined : state[key];
        return (
          <div className="status-row" key={key}>
            <span>{label}</span>
            {key === 'mood' ? (
              <strong>{state.mood}</strong>
            ) : (
              <div className="meter" aria-label={`${label} ${value}`}>
                <span style={{ width: `${value}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create action button component**

Create `app/src/ui/components/ActionButton.tsx`:

```tsx
import type { ReactNode } from 'react';

export function ActionButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="icon-button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}
```

- [ ] **Step 5: Replace Pet Window**

Replace `app/src/ui/windows/PetWindow.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { MessageCircle, Utensils, Heart, Moon } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { buildPetMessages, mapAssistantTextToReply } from '../../domain/petBrain';
import { applyInteraction, createInitialPetState } from '../../domain/petState';
import { emptyMemory } from '../../domain/memory';
import type { MemorySummary, ModelSettings, PetProfile, PetState } from '../../domain/petTypes';
import { backend } from '../../tauri/commands';
import { ActionButton } from '../components/ActionButton';
import { PetSprite } from '../components/PetSprite';
import { StatusBars } from '../components/StatusBars';

const nowIso = () => new Date().toISOString();

const defaultProfile: PetProfile = {
  name: '桃桃',
  species: '桌面小猫',
  personaId: 'healing',
  createdAt: nowIso(),
};

const defaultSettings: ModelSettings = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4.1-mini',
  temperature: 0.7,
};

export function PetWindow() {
  const [profile, setProfile] = useState<PetProfile>(defaultProfile);
  const [state, setState] = useState<PetState>(() => createInitialPetState(nowIso()));
  const [memory, setMemory] = useState<MemorySummary>(() => emptyMemory(nowIso()));
  const [settings, setSettings] = useState<ModelSettings>(defaultSettings);
  const [bubble, setBubble] = useState('点我说话吧。');
  const [inputOpen, setInputOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    backend.loadAppData().then((data) => {
      if (data.profile) setProfile(data.profile);
      if (data.state) setState(data.state);
      setMemory(data.memory);
      setSettings(data.settings);
    });
  }, []);

  async function persist(nextState: PetState) {
    await backend.saveAppData({
      profile,
      state: nextState,
      settings,
      memory,
    });
  }

  async function sendQuickMessage() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    const thinking = applyInteraction(state, 'chat', nowIso());
    setState(thinking);
    setBubble('我在想一想...');

    try {
      const messages = buildPetMessages({ profile, state: thinking, memory, userText: trimmed });
      const response = await backend.sendPetChat({
        baseUrl: settings.baseUrl,
        model: settings.model,
        temperature: settings.temperature,
        messages,
      });
      const reply = mapAssistantTextToReply(response.text, thinking);
      setBubble(reply.text);
      setState(reply.nextState);
      await persist(reply.nextState);
    } catch (error) {
      const message = String(error);
      setBubble(message.toLowerCase().includes('api key') ? '我还没有接上大脑，先去设置 API key 吧。' : '我有点晕乎，等会儿再试试。');
      setState({ ...thinking, action: 'confused', mood: 'confused' });
    } finally {
      setText('');
      setBusy(false);
    }
  }

  function interact(kind: 'feed' | 'pet' | 'rest') {
    const next = applyInteraction(state, kind, nowIso());
    setState(next);
    setBubble(kind === 'feed' ? '好吃！' : kind === 'pet' ? '嘿嘿，再摸一下。' : '我眯一会儿。');
    void persist(next);
  }

  return (
    <main className="pet-window" onMouseDown={() => getCurrentWindow().startDragging()}>
      <div className="speech-bubble">{bubble}</div>
      <button className="pet-click-target" onClick={() => setInputOpen((open) => !open)}>
        <PetSprite action={state.action} />
      </button>
      {inputOpen && (
        <form className="quick-chat" onSubmit={(event) => { event.preventDefault(); void sendQuickMessage(); }}>
          <input aria-label={`和${profile.name}说话`} value={text} onChange={(event) => setText(event.target.value)} />
          <button type="submit" disabled={busy}>发送</button>
        </form>
      )}
      <StatusBars state={state} />
      <div className="pet-actions">
        <ActionButton label="快速对话" onClick={() => setInputOpen((open) => !open)}><MessageCircle size={18} /></ActionButton>
        <ActionButton label="喂食" onClick={() => interact('feed')}><Utensils size={18} /></ActionButton>
        <ActionButton label="摸摸" onClick={() => interact('pet')}><Heart size={18} /></ActionButton>
        <ActionButton label="休息" onClick={() => interact('rest')}><Moon size={18} /></ActionButton>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Add pet window CSS**

Append to `app/src/styles.css`:

```css
.pet-window {
  width: 280px;
  height: 280px;
  padding: 8px;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: 6px;
  background: transparent;
  user-select: none;
}

.speech-bubble,
.quick-chat,
.status-bars {
  background: rgba(255, 252, 244, 0.94);
  border: 1px solid rgba(23, 32, 27, 0.14);
  box-shadow: 0 8px 24px rgba(23, 32, 27, 0.12);
}

.speech-bubble {
  min-height: 42px;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.35;
}

.pet-click-target {
  border: 0;
  background: transparent;
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
}

.pet-sprite {
  width: 128px;
  height: 128px;
  filter: drop-shadow(0 10px 16px rgba(23, 32, 27, 0.18));
}

.pet-sprite-thinking {
  animation: bob 0.8s ease-in-out infinite alternate;
}

.quick-chat {
  display: flex;
  gap: 6px;
  border-radius: 8px;
  padding: 6px;
}

.quick-chat input {
  min-width: 0;
  flex: 1;
  border: 1px solid #d8cbb7;
  border-radius: 6px;
  padding: 6px;
}

.quick-chat button,
.icon-button {
  border: 1px solid #d8cbb7;
  background: #fff8ea;
  color: #17201b;
  border-radius: 7px;
}

.status-bars {
  border-radius: 8px;
  padding: 6px;
  display: grid;
  gap: 4px;
}

.status-row {
  display: grid;
  grid-template-columns: 34px 1fr;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.meter {
  height: 6px;
  border-radius: 999px;
  background: #e8ddca;
  overflow: hidden;
}

.meter span {
  display: block;
  height: 100%;
  background: #4aa77b;
}

.pet-actions {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.icon-button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  cursor: pointer;
}

@keyframes bob {
  from { transform: translateY(0); }
  to { transform: translateY(-6px); }
}
```

- [ ] **Step 7: Run build**

Run:

```bash
cd app
npm run build
```

Expected: build passes.

- [ ] **Step 8: Commit pet window**

Run:

```bash
git add app/src
git commit -m "feat: build pet window interaction"
```

Expected: commit succeeds.

## Task 10: Build Settings Window

**Files:**
- Create: `app/src/ui/windows/SettingsWindow.test.tsx`
- Modify: `app/src/ui/windows/SettingsWindow.tsx`
- Modify: `app/src/styles.css`

- [ ] **Step 1: Write failing settings tests**

Create `app/src/ui/windows/SettingsWindow.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SettingsWindow } from './SettingsWindow';

vi.mock('../../tauri/commands', () => ({
  backend: {
    loadAppData: vi.fn().mockResolvedValue({
      profile: null,
      state: null,
      settings: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', temperature: 0.7 },
      memory: { facts: [], recentSummary: '', updatedAt: '2026-05-30T00:00:00.000Z' },
    }),
    saveAppData: vi.fn().mockImplementation((data) => Promise.resolve(data)),
    saveApiKey: vi.fn().mockResolvedValue('已保存 ****abcd'),
    getApiKeyStatus: vi.fn().mockResolvedValue(null),
  },
}));

describe('SettingsWindow', () => {
  it('saves pet profile and masks api key after save', async () => {
    const user = userEvent.setup();
    render(<SettingsWindow />);

    await user.clear(await screen.findByLabelText('宠物名字'));
    await user.type(screen.getByLabelText('宠物名字'), '桃桃');
    await user.type(screen.getByLabelText('API key'), 'sk-testabcd');
    await user.click(screen.getByRole('button', { name: '保存设置' }));

    expect(await screen.findByText('已保存 ****abcd')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
cd app
npm run test:run -- src/ui/windows/SettingsWindow.test.tsx
```

Expected: fail because form labels and save behavior are absent.

- [ ] **Step 3: Implement settings window**

Replace `app/src/ui/windows/SettingsWindow.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { createInitialPetState } from '../../domain/petState';
import { emptyMemory } from '../../domain/memory';
import type { ModelSettings, PetPersonaId, PetProfile } from '../../domain/petTypes';
import { backend } from '../../tauri/commands';

const nowIso = () => new Date().toISOString();

export function SettingsWindow() {
  const [name, setName] = useState('桃桃');
  const [species, setSpecies] = useState('桌面小猫');
  const [personaId, setPersonaId] = useState<PetPersonaId>('healing');
  const [settings, setSettings] = useState<ModelSettings>({
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    temperature: 0.7,
  });
  const [apiKey, setApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    backend.loadAppData().then((data) => {
      if (data.profile) {
        setName(data.profile.name);
        setSpecies(data.profile.species);
        setPersonaId(data.profile.personaId);
      }
      setSettings(data.settings);
    });
    backend.getApiKeyStatus().then(setKeyStatus);
  }, []);

  async function save() {
    const createdAt = nowIso();
    const profile: PetProfile = { name, species, personaId, createdAt };
    if (apiKey.trim()) {
      const masked = await backend.saveApiKey(apiKey.trim());
      setKeyStatus(masked);
      setApiKey('');
    }
    await backend.saveAppData({
      profile,
      state: createInitialPetState(createdAt),
      settings,
      memory: emptyMemory(createdAt),
    });
    setMessage('设置已保存');
  }

  return (
    <main className="panel-window settings-window">
      <h1>宠物核心</h1>
      <label>
        宠物名字
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        宠物形象
        <input value={species} onChange={(event) => setSpecies(event.target.value)} />
      </label>
      <label>
        性格
        <select value={personaId} onChange={(event) => setPersonaId(event.target.value as PetPersonaId)}>
          <option value="healing">治愈</option>
          <option value="tsundere">嘴硬</option>
          <option value="studyBuddy">学习搭子</option>
          <option value="energetic">元气陪伴</option>
        </select>
      </label>
      <label>
        Base URL
        <input value={settings.baseUrl} onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })} />
      </label>
      <label>
        模型
        <input value={settings.model} onChange={(event) => setSettings({ ...settings, model: event.target.value })} />
      </label>
      <label>
        API key
        <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
      </label>
      {keyStatus && <p className="key-status">{keyStatus}</p>}
      {message && <p className="save-message">{message}</p>}
      <button className="primary-button" onClick={() => void save()}>保存设置</button>
    </main>
  );
}
```

- [ ] **Step 4: Add settings CSS**

Append to `app/src/styles.css`:

```css
.settings-window {
  padding: 24px;
  display: grid;
  gap: 14px;
  align-content: start;
}

.settings-window h1 {
  margin: 0 0 6px;
  font-size: 24px;
}

.settings-window label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}

.settings-window input,
.settings-window select {
  min-height: 38px;
  border: 1px solid #d8cbb7;
  border-radius: 7px;
  padding: 8px 10px;
  background: #fffdf7;
}

.primary-button {
  min-height: 40px;
  border: 0;
  border-radius: 7px;
  background: #2f6f5e;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.key-status,
.save-message {
  margin: 0;
  font-size: 13px;
}
```

- [ ] **Step 5: Run settings test**

Run:

```bash
cd app
npm run test:run -- src/ui/windows/SettingsWindow.test.tsx
```

Expected: test passes.

- [ ] **Step 6: Commit settings window**

Run:

```bash
git add app/src/ui/windows/SettingsWindow.tsx app/src/ui/windows/SettingsWindow.test.tsx app/src/styles.css
git commit -m "feat: build pet settings window"
```

Expected: commit succeeds.

## Task 11: Build Deep Chat Window

**Files:**
- Create: `app/src/ui/components/MessageList.tsx`
- Create: `app/src/ui/windows/ChatWindow.test.tsx`
- Modify: `app/src/ui/windows/ChatWindow.tsx`
- Modify: `app/src/styles.css`

- [ ] **Step 1: Create message list**

Create `app/src/ui/components/MessageList.tsx`:

```tsx
import type { UiChatMessage } from '../../tauri/commandTypes';

export function MessageList({ messages }: { messages: UiChatMessage[] }) {
  return (
    <div className="message-list" aria-label="chat messages">
      {messages.map((message) => (
        <article className={`message message-${message.role}`} key={message.id}>
          {message.content}
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write failing chat test**

Create `app/src/ui/windows/ChatWindow.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatWindow } from './ChatWindow';

vi.mock('../../tauri/commands', () => ({
  backend: {
    loadAppData: vi.fn().mockResolvedValue({
      profile: { name: '桃桃', species: '桌面小猫', personaId: 'healing', createdAt: '2026-05-30T00:00:00.000Z' },
      state: { mood: 'calm', hunger: 20, energy: 80, intimacy: 10, action: 'idle', lastInteractionAt: '2026-05-30T00:00:00.000Z' },
      settings: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', temperature: 0.7 },
      memory: { facts: [], recentSummary: '', updatedAt: '2026-05-30T00:00:00.000Z' },
    }),
    sendPetChat: vi.fn().mockResolvedValue({ text: '我在这里陪你。' }),
    saveAppData: vi.fn().mockImplementation((data) => Promise.resolve(data)),
  },
}));

describe('ChatWindow', () => {
  it('sends user message and shows pet reply', async () => {
    const user = userEvent.setup();
    render(<ChatWindow />);

    await user.type(await screen.findByLabelText('聊天输入'), '今天好累');
    await user.click(screen.getByRole('button', { name: '发送消息' }));

    expect(await screen.findByText('今天好累')).toBeInTheDocument();
    expect(await screen.findByText('我在这里陪你。')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test and verify failure**

Run:

```bash
cd app
npm run test:run -- src/ui/windows/ChatWindow.test.tsx
```

Expected: fail because chat input and send behavior are absent.

- [ ] **Step 4: Implement chat window**

Replace `app/src/ui/windows/ChatWindow.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { buildPetMessages, mapAssistantTextToReply } from '../../domain/petBrain';
import { createInitialPetState } from '../../domain/petState';
import { emptyMemory } from '../../domain/memory';
import type { MemorySummary, ModelSettings, PetProfile, PetState } from '../../domain/petTypes';
import { backend } from '../../tauri/commands';
import type { UiChatMessage } from '../../tauri/commandTypes';
import { MessageList } from '../components/MessageList';

const nowIso = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export function ChatWindow() {
  const [profile, setProfile] = useState<PetProfile>({ name: '桃桃', species: '桌面小猫', personaId: 'healing', createdAt: nowIso() });
  const [state, setState] = useState<PetState>(() => createInitialPetState(nowIso()));
  const [memory, setMemory] = useState<MemorySummary>(() => emptyMemory(nowIso()));
  const [settings, setSettings] = useState<ModelSettings>({ baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', temperature: 0.7 });
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    backend.loadAppData().then((data) => {
      if (data.profile) setProfile(data.profile);
      if (data.state) setState(data.state);
      setMemory(data.memory);
      setSettings(data.settings);
    });
  }, []);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const userMessage: UiChatMessage = { id: id(), role: 'user', content: trimmed, createdAt: nowIso() };
    setMessages((current) => [...current, userMessage]);
    setText('');
    setBusy(true);

    try {
      const aiMessages = buildPetMessages({ profile, state, memory, userText: trimmed });
      const response = await backend.sendPetChat({
        baseUrl: settings.baseUrl,
        model: settings.model,
        temperature: settings.temperature,
        messages: aiMessages,
      });
      const reply = mapAssistantTextToReply(response.text, state);
      const petMessage: UiChatMessage = { id: id(), role: 'pet', content: reply.text, createdAt: nowIso() };
      setMessages((current) => [...current, petMessage]);
      setState(reply.nextState);
      await backend.saveAppData({ profile, state: reply.nextState, settings, memory });
    } catch (error) {
      const petMessage: UiChatMessage = {
        id: id(),
        role: 'pet',
        content: String(error).toLowerCase().includes('api key') ? '我还没有接上大脑，去设置里放入 API key 吧。' : '我有点晕乎，这次没想明白。',
        createdAt: nowIso(),
      };
      setMessages((current) => [...current, petMessage]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="panel-window chat-window">
      <header>
        <h1>和{profile.name}聊天</h1>
        <p>{profile.species} · {state.mood}</p>
      </header>
      <MessageList messages={messages} />
      <form className="chat-form" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        <label>
          聊天输入
          <textarea value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        <button className="primary-button" type="submit" disabled={busy} aria-label="发送消息">发送</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 5: Add chat CSS**

Append to `app/src/styles.css`:

```css
.chat-window {
  height: 100vh;
  padding: 20px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 14px;
}

.chat-window h1,
.chat-window p {
  margin: 0;
}

.message-list {
  min-height: 0;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 10px;
}

.message {
  max-width: 82%;
  border-radius: 8px;
  padding: 10px 12px;
  line-height: 1.45;
}

.message-user {
  justify-self: end;
  background: #2f6f5e;
  color: #fff;
}

.message-pet {
  justify-self: start;
  background: #fffdf7;
  border: 1px solid #d8cbb7;
}

.chat-form {
  display: grid;
  gap: 10px;
}

.chat-form label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}

.chat-form textarea {
  min-height: 86px;
  resize: vertical;
  border: 1px solid #d8cbb7;
  border-radius: 7px;
  padding: 10px;
}
```

- [ ] **Step 6: Run chat test**

Run:

```bash
cd app
npm run test:run -- src/ui/windows/ChatWindow.test.tsx
```

Expected: test passes.

- [ ] **Step 7: Commit chat window**

Run:

```bash
git add app/src/ui/components/MessageList.tsx app/src/ui/windows/ChatWindow.tsx app/src/ui/windows/ChatWindow.test.tsx app/src/styles.css
git commit -m "feat: build deep chat window"
```

Expected: commit succeeds.

## Task 12: Final Verification and Manual Acceptance

**Files:**
- Modify: `app/README.md`

- [ ] **Step 1: Run full automated checks**

Run:

```bash
cd app
npm run test:run
npm run build
cd src-tauri
cargo test
```

Expected: Vitest passes, frontend build passes, Rust tests pass.

- [ ] **Step 2: Run desktop app**

Run:

```bash
cd app
npm run tauri:dev
```

Expected:

```text
Pet window opens.
Pet window is transparent and undecorated.
Tray menu opens settings and chat windows.
Settings window saves pet data.
API key is masked after save.
Pet quick chat calls backend command.
Chat window sends a message and displays the pet reply.
```

- [ ] **Step 3: Verify API key is not in frontend storage**

Open devtools or inspect local app files and verify:

```text
No API key appears in localStorage.
No API key appears in app-data.json.
The settings UI only shows a masked key status.
```

- [ ] **Step 4: Add README**

Create `app/README.md`:

```md
# Desktop AI Pet

Desktop AI Pet is a Tauri desktop pet prototype. The pet is the primary interface. Users can configure a local OpenAI-compatible API key, then talk to the pet through quick chat or the deep chat window.

## Run

```bash
npm install
npm run tauri:dev
```

## Test

```bash
npm run test:run
npm run build
cd src-tauri
cargo test
```

## Secret Handling

The frontend does not store the API key. The settings window sends the key to a Tauri command, and the Rust backend stores it with the system credential store through the `keyring` crate. Non-secret pet data is saved in the app data directory as JSON.
```

- [ ] **Step 5: Commit verification docs**

Run:

```bash
git add app/README.md
git commit -m "docs: add desktop pet runbook"
```

Expected: commit succeeds.

## Self-Review Notes

Spec coverage:

- Desktop-first Tauri app: Tasks 1, 7, and 12.
- Transparent pet window, tray, settings, chat: Tasks 7, 9, 10, and 11.
- Pet persona, state, memory wrapping AI calls: Tasks 3, 4, 9, and 11.
- API key stored outside frontend storage: Tasks 5, 6, 10, and 12.
- OpenAI-compatible adapter: Task 6.
- Local persistence: Task 5.
- Error handling for missing key and failed AI calls: Tasks 6, 9, and 11.
- Automated and manual acceptance: Tasks 3, 4, 5, 10, 11, and 12.

Completeness scan:

- The plan contains no unresolved marker text or undefined task references.
- Each code task provides exact file paths and concrete code blocks.

Type consistency:

- TypeScript command types use `camelCase`, matching Rust `serde(rename_all = "camelCase")`.
- Frontend calls `send_pet_chat` through `backend.sendPetChat`, matching the Rust command name.
- `PetState`, `PetProfile`, `ModelSettings`, and `MemorySummary` are consistently shared across domain modules and command types.
