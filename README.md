# Wine Voice AI

Voice-enabled wine advisor workspace built around a provided wine catalog. The project turns a static dataset into a grounded product experience: users can ask about wines by voice or text, see recommendations on screen, and hear replies spoken back in a natural voice.

This repo publishes the full engineering workspace:

- `wine-boutique-world` — flagship 3D boutique demo with an in-world sommelier consultation
- `wine-voice-explorer` — simpler standalone sandbox for the same advisor
- `packages/wine-ai-core` — shared retrieval, prompt, streaming, voice, and proxy logic

## Dataset

The wine catalog comes from the provided spreadsheet and is mirrored locally as JSON assets for fast client-side retrieval:

- [Wine dataset spreadsheet](https://docs.google.com/spreadsheets/d/1Bkv3Jb_8YuLUG2rWUhJhQBdaGjQCMFfwF9oJ5jrYDSA/edit?usp=sharing)

The assistant is designed to stay grounded in that catalog rather than inventing bottles, prices, or critic scores.

## What The System Does

- loads a wine catalog as the source of truth
- accepts voice or text questions
- parses structured shopping signals such as price, region, color, varietal, and gift intent
- retrieves a candidate set locally from the wine data
- sends only grounded catalog context to Vertex AI
- streams the answer into the UI and speaks it aloud with Google Cloud TTS

The flagship boutique app adds a richer product shell around that core: 3D scene, NPC interaction, ambience, and an integrated consultation overlay.

## Workspace Layout

```text
Wine_Voice_AI/
├── wine-boutique-world/      # flagship 3D boutique app
├── wine-voice-explorer/      # standalone sandbox app
└── packages/
    └── wine-ai-core/         # shared retrieval, voice, prompt, and proxy code
```

More detail is in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Architecture Summary

High-level request flow:

```text
voice/text question
  -> browser input handling
  -> query parsing + local catalog retrieval
  -> grounded prompt assembly
  -> Vertex AI streamed response
  -> text in UI
  -> Google Cloud TTS playback
```

Key design decisions:

- The catalog remains the source of truth.
- Retrieval is structured and local, not a free-form “ask the model to know wine” approach.
- The shared core keeps retrieval and voice behavior consistent across both apps.
- The boutique app is optimized for a polished demo; the explorer stays simpler for experimentation.

## Quick Start

### Prerequisites

- Node.js 20+
- npm 9+
- Google Cloud SDK (`gcloud`)
- A Google Cloud project with:
  - Vertex AI API enabled
  - Cloud Text-to-Speech API enabled
  - optional: Cloud Speech-to-Text API if you want to experiment with the non-demo server path

Authenticate locally:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Install

```bash
npm install
cp wine-boutique-world/.env.example wine-boutique-world/.env
cp wine-voice-explorer/.env.example wine-voice-explorer/.env
```

Set `VITE_GOOGLE_CLOUD_PROJECT` in each app if your Google Cloud project differs from the default.

### Run

```bash
# Flagship boutique app
npm run dev:boutique

# Standalone explorer sandbox
npm run dev:explorer

# Shared standalone proxy server for non-Vite environments
npm run proxy:server
```

### Build And Test

```bash
npm run build:all
npm run test:all
npm run check:all
```

## Browser Support

- `wine-boutique-world` voice input is tuned for Chrome-family browsers.
- Safari should be treated as text-first in the flagship boutique app.
- Voice output uses Google Cloud TTS for the premium sommelier voice.

## Security And Credentials

- No API keys are required in the browser.
- Google Cloud requests are routed through the shared proxy layer in `packages/wine-ai-core/server`.
- Local auth is handled through `gcloud auth print-access-token`.
- `.env` files, internal notes, and local-only workspace material are intentionally excluded from source control.

See [SECURITY.md](./SECURITY.md) for the public security note.

## Public Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [wine-boutique-world/README.md](./wine-boutique-world/README.md)
- [wine-voice-explorer/README.md](./wine-voice-explorer/README.md)

## Known Limitations

- The flagship boutique app is optimized for demo stability, not full production deployment.
- Voice input quality depends on browser speech recognition in the current Chrome-first demo path.
- The boutique build still carries large 3D asset chunks and could benefit from additional code-splitting.
- The local Google-auth proxy setup is convenient for development, but a production deployment would need a hardened server-side auth strategy.

## License

[MIT](./LICENSE)
