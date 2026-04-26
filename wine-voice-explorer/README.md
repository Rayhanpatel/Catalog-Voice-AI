# Voice Explorer

Standalone sandbox for the shared Catalog Voice AI core. This app keeps a simpler full-screen chat interface for experimenting with the same grounded product advisor that powers the flagship boutique experience.

## Responsibilities

This app is useful for:

- validating retrieval and answer quality without the 3D scene
- testing voice-first interaction in a simpler shell
- iterating on prompt, catalog, and voice behavior with less host-product overhead

The flagship integrated experience lives in `wine-boutique-world`. Shared logic lives in `@wine-voice-ai/wine-ai-core`.

## Features

- grounded answers from the provided product catalog
- voice or text input
- streamed answers
- premium cloud TTS when available
- conversation carry-forward for follow-up questions
- recommendation cards for referenced products

## Local Development

From the workspace root:

```bash
npm install
cp wine-voice-explorer/.env.example wine-voice-explorer/.env
npm run dev:explorer
```

Chrome or Edge are the best options for voice input in this app.

## Commands

```bash
npm run dev
npm run build
npm run preview
```

## Notes

- This app stays intentionally simpler than the boutique host.
- It shares the same retrieval, prompt, streaming, and speech infrastructure as the flagship app.
- The package remains `"private": true` to prevent accidental npm publication; the repo itself is intended to be public.
