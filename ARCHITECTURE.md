# Wine Voice AI Architecture

## Workspace roles

- `wine-boutique-world` is the flagship product. It owns the 3D boutique, NPC interaction flow, ambience, and the integrated tasting consultation UI.
- `wine-voice-explorer` is the sandbox and standalone demo surface. It uses the same retrieval and speech core, but keeps a simpler full-screen chat shell for experimentation.
- `packages/wine-ai-core` is the shared source of truth for:
  - wine catalog loading and filtering
  - natural-language query parsing
  - follow-up carry-forward logic
  - closest-match relaxation
  - Vertex AI prompt and stream helpers
  - browser speech-input runtime state for the current demo path
  - cloud TTS primitives for premium spoken replies
  - shared proxy/server boundary for `/api/vertex`, `/api/tts`, `/api/wine-image`, and `/api/health`

## Product flow

1. The player approaches the sommelier in `wine-boutique-world`.
2. `activeInteraction === 'sommelier'` opens the consultation shell and freezes movement.
3. The boutique app preloads the wine catalog and voice runtime through shared core helpers.
4. The consultation retrieves candidate bottles from the local catalog, streams a grounded answer from Vertex AI, and attaches recommendation cards from the active candidate set only.
5. Cloud TTS drives the premium male sommelier voice. If cloud TTS is unavailable in the boutique app, the reply stays text-only and the UI shows an inline warning instead of falling back to robot speech.
6. For the current demo-safe input path, Chrome-family browsers provide speech recognition while Safari is treated as text-first in the flagship app.

## Runtime boundary

- During local development and Vite preview, both apps mount the shared middleware from `packages/wine-ai-core/server/proxy.mjs`.
- For deployable environments, `packages/wine-ai-core/server/app.mjs` provides a small standalone Node server that exposes the same API routes without requiring Vite to be the runtime host.

## Defaults

- Chrome is the primary browser for the integrated boutique demo.
- `Midnight in Garda` is the default boutique ambience track.
- The boutique app is optimized for premium demo quality first; the explorer remains more permissive as a sandbox.
