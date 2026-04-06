# Wine Boutique World

Flagship product surface for the Wine Voice AI workspace. This app wraps the grounded wine advisor in a compact 3D boutique with an NPC sommelier, in-world interaction prompt, ambience, and an integrated consultation overlay.

## Responsibilities

This app owns:

- the 3D room shell and first-person movement
- sommelier NPC presence and interaction flow
- the consultation overlay and session lifecycle
- boutique ambience and readiness overlays
- host-side orchestration around the shared AI core

Shared retrieval, prompt, stream, voice, and proxy logic lives in `@wine-voice-ai/wine-ai-core`.

## Stack

- React 19
- TypeScript
- Vite
- React Three Fiber / Three.js
- Zustand
- shared `@wine-voice-ai/wine-ai-core`

## Current Demo Behavior

- approach the sommelier and press `E` to start a consultation
- ask by voice or type into the consultation panel
- answers remain grounded in the wine catalog
- replies appear in text and play through premium cloud TTS
- wine recommendation cards stay attached to the answer that referenced them
- `New consultation` resets the current session without leaving the boutique

## Local Development

From the workspace root:

```bash
npm install
cp wine-boutique-world/.env.example wine-boutique-world/.env
npm run dev:boutique
```

Open the Vite URL and use:

- `W A S D` to move
- mouse to look
- `Esc` to release pointer lock
- `E` near the sommelier to open the consultation

Chrome is the recommended browser for voice input in this app.

## Project Structure

```text
src/
  app/          # application shell, overlays, styles
  config/       # default tuning and presets
  features/
    audio/      # boutique ambience
    debug/      # runtime tuning and debug UI
    health/     # readiness checks for local AI/TTS availability
    npc/        # sommelier interaction shell and consultation flow
    player/     # first-person input and movement
    world/      # room scene, lighting, world asset wrapper
  lib/          # math, bounds, shared local helpers
tests/          # unit and end-to-end coverage
```

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run test:e2e
```

## Notes

- The boutique app is the primary product surface in this workspace.
- Safari should be treated as text-first for this flagship app.
- The room shell includes a fallback path when the heavier world asset is unavailable.
- The app keeps `"private": true` in `package.json` to avoid accidental npm publishing; the repo itself is intended to be public.
