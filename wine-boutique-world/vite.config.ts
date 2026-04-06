import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error shared Node-only proxy middleware is loaded at runtime from the workspace package
import { createWineAiProxyMiddleware } from '../packages/wine-ai-core/server/proxy.mjs'

const GOOGLE_CLOUD_PROJECT = process.env.VITE_GOOGLE_CLOUD_PROJECT ?? 'wine-voice-explorer'
const projectRoot = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'wine-ai-proxy',
      configureServer(server) {
        server.middlewares.use(createWineAiProxyMiddleware({ projectId: GOOGLE_CLOUD_PROJECT }))
      },
      configurePreviewServer(server) {
        server.middlewares.use(createWineAiProxyMiddleware({ projectId: GOOGLE_CLOUD_PROJECT }))
      },
    },
  ],
  assetsInclude: ['**/*.spz'],
  resolve: {
    alias: {
      '@wine-voice-ai/wine-ai-core': path.resolve(projectRoot, '../packages/wine-ai-core/src/index.ts'),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(projectRoot, '..')],
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
})
