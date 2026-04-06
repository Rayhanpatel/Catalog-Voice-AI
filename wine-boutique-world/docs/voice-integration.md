# Voice Integration Notes

The boutique app is now the primary integrated experience. The old “future integration” split has become:

- `wine-boutique-world` owns the world shell, NPC interaction flow, and consultation UI
- `wine-voice-explorer` remains the sandbox/demo shell
- `packages/wine-ai-core` owns shared catalog, retrieval, prompt, streaming, speech, and proxy logic

## Recommended seam

Current interaction flow:

1. Player enters NPC radius
2. Prompt appears
3. Player presses `E`
4. `openSommelierInteraction()` opens the consultation shell

Current integration contract:

- keep `FirstPersonController.tsx` responsible only for movement, look, and proximity detection
- keep `SommelierPlaceholder.tsx` and `SommelierVrm.tsx` responsible only for in-world presence, facing behavior, and prompt placement
- keep `SommelierInteractionShell.tsx` responsible for the boutique-native overlay, while shared logic comes from `wine-ai-core`

## Suggested contract

The boutique host should continue to own:

- the active interaction target, such as `sommelier`
- close/open callbacks and pointer-lock release
- boutique-specific greeting and panel wording
- ambience and demo-readiness overlays

The shared core should own:

- microphone and speech-session primitives
- recommendation logic
- wine matching and closest-match relaxation
- Vertex AI requests and TTS requests
- deployable proxy/server routes

## Why this split is useful

- the 3D room remains lightweight and easier to tune
- movement/collision changes do not risk voice features
- the explorer can evolve as a sandbox without destabilizing the boutique app
- the NPC interaction shell stays a clean host boundary rather than a second source of recommendation logic
