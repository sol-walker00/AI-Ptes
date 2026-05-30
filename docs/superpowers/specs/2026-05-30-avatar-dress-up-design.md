# Avatar Dress-Up Design

## Goal

Add a first playable avatar customization loop: users can assemble a cartoon pet from preset body shapes, colors, facial styles, cheek styles, and accessories, then see the saved appearance in the desktop pet window.

## Scope

V1 uses deterministic SVG/React layers instead of image upload or AI generation. This keeps the desktop pet stable, transparent, small, and testable while still feeling like a dress-up mini game. The data shape should leave room for future upload/generated assets.

## User Experience

Settings gains a "形象装扮" section with a live preview and compact option groups:

- Body: cat, bear, bunny, blob.
- Colors: primary and secondary swatches.
- Face: eye style, mouth style, cheek style.
- Accessory: none, bow, cap, headphones, scarf.

Saving settings persists the selected avatar. The pet window uses the same avatar renderer, so changes appear after loading the saved profile.

## Data Model

`PetProfile` gains an `avatar` object:

- `body`: `cat | bear | bunny | blob`
- `primaryColor`: hex color string
- `secondaryColor`: hex color string
- `eyeStyle`: `dot | sparkle | sleepy`
- `mouthStyle`: `smile | cat | shy`
- `cheekStyle`: `none | pink | peach`
- `accessory`: `none | bow | cap | headphones | scarf`

Legacy profiles without `avatar` normalize to the default honey cat.

## Rendering

Create one reusable cartoon renderer for both preview and desktop pet. The renderer outputs layered SVG with stable dimensions and no external image dependency. Existing action CSS classes still apply to the wrapper so current animations continue working.

## Persistence

Browser fallback storage and Tauri/Rust storage must round-trip avatar data. Rust model defaults must hydrate legacy app data without dropping the avatar on save.

## Verification

Automated tests cover avatar defaults, legacy normalization, profile save payloads, and SVG renderer output. Browser smoke verifies the settings dress-up controls and the pet window render the selected avatar without clipping.
