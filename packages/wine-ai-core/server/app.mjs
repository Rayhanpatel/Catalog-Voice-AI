import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { createWineAiProxyMiddleware } from './proxy.mjs'

export function createWineAiServer({
  projectId,
  host = process.env.HOST ?? '127.0.0.1',
  port = Number(process.env.PORT ?? 8787),
  allowedImageHosts,
} = {}) {
  if (!projectId) {
    throw new Error('projectId is required to start the Wine AI server.')
  }

  const middleware = createWineAiProxyMiddleware({
    projectId,
    allowedImageHosts,
  })

  const server = http.createServer((req, res) => {
    void middleware(req, res, () => {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: false, message: 'Route not found.' }))
    })
  })

  return {
    server,
    host,
    port,
    listen() {
      return new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, host, () => {
          server.off('error', reject)
          resolve({ host, port })
        })
      })
    },
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]

if (isDirectRun) {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? 'wine-voice-explorer'
  const wineAiServer = createWineAiServer({ projectId })

  wineAiServer
    .listen()
    .then(({ host, port }) => {
      console.log(`[Wine AI Server] listening on http://${host}:${port}`)
    })
    .catch((error) => {
      console.error('[Wine AI Server] failed to start.', error)
      process.exitCode = 1
    })
}
