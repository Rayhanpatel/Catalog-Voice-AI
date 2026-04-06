import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createWineAiProxyMiddleware } from '../packages/wine-ai-core/server/proxy.mjs'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'wine-ai-proxy',
      configureServer(server) {
        server.middlewares.use(createWineAiProxyMiddleware({ projectId: process.env.VITE_GOOGLE_CLOUD_PROJECT ?? 'wine-voice-explorer' }))
      },
      configurePreviewServer(server) {
        server.middlewares.use(createWineAiProxyMiddleware({ projectId: process.env.VITE_GOOGLE_CLOUD_PROJECT ?? 'wine-voice-explorer' }))
      },
    },
  ],
  resolve: {
    alias: {
      '@wine-voice-ai/wine-ai-core': path.resolve(projectRoot, '../packages/wine-ai-core/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: [path.resolve(projectRoot, '..')],
    }
  }
})
