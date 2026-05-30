# Avatar Dress-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable cartoon avatar customization flow that persists and renders in the desktop pet.

**Architecture:** Add a focused avatar domain module for defaults, options, and normalization. Replace the fixed pet image with a reusable SVG avatar component used by both the settings preview and pet window. Extend profile persistence in TypeScript and Rust so legacy users get a default avatar and new selections round-trip.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Tauri Rust serde models, SVG rendered by React.

---

### Task 1: Avatar Domain Model

**Files:**
- Create: `app/src/domain/petAvatar.ts`
- Create: `app/src/domain/petAvatar.test.ts`
- Modify: `app/src/domain/petTypes.ts`
- Modify: `app/src/tauri/commands.ts`

- [ ] Write a failing test that `defaultPetAvatar()` returns the honey cat avatar and `normalizePetAvatar(undefined)` returns the same value.
- [ ] Run `npm run test:run -- src/domain/petAvatar.test.ts` and confirm it fails because the module does not exist.
- [ ] Implement `PetAvatar`, option arrays, `defaultPetAvatar`, and `normalizePetAvatar`.
- [ ] Normalize `data.profile.avatar` in `normalizeAppData`.
- [ ] Re-run the domain test and confirm it passes.

### Task 2: SVG Avatar Renderer

**Files:**
- Create: `app/src/ui/components/CartoonAvatar.tsx`
- Create: `app/src/ui/components/CartoonAvatar.test.tsx`
- Modify: `app/src/ui/components/PetSprite.tsx`

- [ ] Write a failing renderer test that selected body, colors, face, and accessory are present in the SVG.
- [ ] Run `npm run test:run -- src/ui/components/CartoonAvatar.test.tsx` and confirm it fails because the component does not exist.
- [ ] Implement a layered SVG renderer and pass avatar through `PetSprite`.
- [ ] Re-run the renderer test and confirm it passes.

### Task 3: Settings Dress-Up UI

**Files:**
- Create: `app/src/ui/components/AvatarCustomizer.tsx`
- Modify: `app/src/ui/windows/SettingsWindow.tsx`
- Modify: `app/src/ui/windows/PetWindow.tsx`
- Modify: `app/src/ui/windows/SettingsWindow.test.tsx`
- Modify: `app/src/ui/windows/PetWindow.test.tsx`
- Modify: `app/src/styles.css`

- [ ] Write failing tests that settings renders dress-up controls and saves a changed avatar.
- [ ] Run `npm run test:run -- src/ui/windows/SettingsWindow.test.tsx` and confirm the tests fail because controls are missing.
- [ ] Add `AvatarCustomizer`, wire settings state, and pass the saved avatar to the pet window sprite.
- [ ] Re-run the window tests and confirm they pass.

### Task 4: Tauri Persistence

**Files:**
- Modify: `app/src-tauri/src/models.rs`
- Modify: `app/src-tauri/src/storage.rs`

- [ ] Add a Rust storage test proving legacy profiles load with a default avatar and saved avatar fields round-trip.
- [ ] Run `PATH="$HOME/.cargo/bin:$PATH" cargo test` in `app/src-tauri` and confirm the new test fails.
- [ ] Add Rust `PetAvatar` model and serde defaults.
- [ ] Re-run `cargo test` and confirm it passes.

### Task 5: Full Verification

**Files:**
- No new files.

- [ ] Run `npm run test:run`.
- [ ] Run `npm run build`.
- [ ] Run `PATH="$HOME/.cargo/bin:$PATH" cargo test`.
- [ ] Run `git diff --check`.
- [ ] Use the in-app browser to change avatar settings and verify the pet window renders the selected appearance without overflow or clipping.
